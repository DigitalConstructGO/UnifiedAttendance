import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { and, eq, isNull, like } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import {
  attendanceDays,
  branches,
  branchWorkingDays,
  employees,
  employmentPeriods,
  holidays,
  organizations,
  people,
  roles,
  user,
  userRoles,
} from "@UnifiedAttendance/db/schema/index";

import { loadBranchesOnHoliday, loadDayContext } from "../../../src/attendance/day-context";
import {
  ensureEthiopianHolidays,
  ethiopianPublicHolidays,
  ethiopianYearsToCover,
  syncEthiopianHolidays,
} from "../../../src/modules/holidays/ethiopian";
import {
  createHoliday,
  deleteHoliday,
  listHolidays,
  syncHolidays,
  updateHoliday,
} from "../../../src/modules/organization/service";
import { getAttendanceSummary } from "../../../src/modules/reports/service";
import { attendanceSummaryInput } from "../../../src/validations/reports";
import { resetDatabase, testContext } from "../../fixtures";

const admin = testContext("admin");
const hr = testContext("hr");
const anonymous = testContext();

const TIMEZONE = "Africa/Addis_Ababa";

// Victory of Adwa, Ethiopian year 2018 — a Monday in the same fixed week the other
// attendance suites use, so it is safely in the past and lands on a working day.
const ADWA = "2026-03-02";
const ADWA_WEEK_END = "2026-03-08";

/** The years a sync covers by default, and how many rows that should produce. */
const DEFAULT_YEARS = [2018, 2019];
const DEFAULT_ROWS = DEFAULT_YEARS.flatMap(ethiopianPublicHolidays).length;

async function seedUser(id: string, roleName: string) {
  await db
    .insert(user)
    .values({ id, name: id, email: `${id}@example.test`, emailVerified: true })
    .onConflictDoNothing();
  const [role] = await db.select().from(roles).where(eq(roles.name, roleName)).limit(1);
  await db.insert(userRoles).values({ userId: id, roleId: role!.id });
}

async function seedBranch(name = "HQ") {
  const [branch] = await db
    .insert(branches)
    .values({ name, code: name, timezone: TIMEZONE, createdAt: new Date("2025-01-01T00:00:00Z") })
    .returning();
  await db.insert(branchWorkingDays).values(
    [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
      branchId: branch!.id,
      weekday,
      isWorkingDay: weekday < 5,
      openingTime: weekday < 5 ? "09:00" : null,
      closingTime: weekday < 5 ? "17:00" : null,
    })),
  );
  return branch!.id;
}

async function seedEmployee(branchId: string, code = "EMP-1") {
  const [person] = await db.insert(people).values({ firstName: code, lastName: "T" }).returning();
  const [employee] = await db
    .insert(employees)
    .values({ personId: person!.id, branchId, employeeCode: code, hireDate: "2025-01-01" })
    .returning();
  await db.insert(employmentPeriods).values({
    employeeId: employee!.id,
    branchId,
    effectiveFrom: "2025-01-01",
    status: "active",
  });
  return employee!.id;
}

function autoRows() {
  return db.select().from(holidays).where(eq(holidays.source, "auto"));
}

function rowByKey(key: string) {
  return db
    .select()
    .from(holidays)
    .where(eq(holidays.holidayKey, key))
    .limit(1)
    .then((rows) => rows[0]);
}

describe("Ethiopian holiday generation", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedUser("admin", "Admin");
    await seedUser("hr", "HR");
    await db.insert(organizations).values({ name: "Org", code: "ORG", timezone: TIMEZONE });
  });

  describe("syncEthiopianHolidays", () => {
    it("writes one org-wide row per holiday of each requested year", async () => {
      const result = await syncEthiopianHolidays(admin, { years: DEFAULT_YEARS });

      expect(result).toEqual({ years: DEFAULT_YEARS, inserted: DEFAULT_ROWS, updated: 0 });
      expect(await autoRows()).toHaveLength(DEFAULT_ROWS);
      await expect(
        rowByKey("2019:enkutatash").then((row) => ({ ...row, id: undefined })),
      ).resolves.toMatchObject({
        name: "Ethiopian New Year (Enkutatash)",
        holidayDate: "2026-09-11",
        ethiopianDate: "2019-01-01",
        branchId: null,
        source: "auto",
      });
    });

    it("changes nothing when run again", async () => {
      await syncEthiopianHolidays(admin, { years: DEFAULT_YEARS });
      const before = await autoRows();

      const second = await syncEthiopianHolidays(admin, { years: DEFAULT_YEARS });

      expect(second).toEqual({ years: DEFAULT_YEARS, inserted: 0, updated: 0 });
      const after = await autoRows();
      expect(after).toHaveLength(before.length);
      expect(new Set(after.map((row) => row.id))).toEqual(new Set(before.map((row) => row.id)));
    });

    it("repairs a generated row that drifted from the calendar", async () => {
      await syncEthiopianHolidays(admin, { years: [2019] });
      const original = await rowByKey("2019:fasika");
      await db
        .update(holidays)
        .set({ holidayDate: "2027-01-01", name: "Wrong" })
        .where(eq(holidays.id, original!.id));

      const result = await syncEthiopianHolidays(admin, { years: [2019] });

      expect(result).toMatchObject({ inserted: 0, updated: 1 });
      await expect(rowByKey("2019:fasika")).resolves.toMatchObject({
        id: original!.id,
        holidayDate: "2027-05-02",
        name: "Ethiopian Easter",
      });
    });

    it("keeps both occurrences when a Muslim holiday falls twice in one Ethiopian year", async () => {
      // Mawlid falls twice inside Ethiopian 2017. Losing one to a key collision would
      // silently turn a public holiday back into a working day.
      const result = await syncEthiopianHolidays(admin, { years: [2017] });

      expect(result.inserted).toBe(15);
      const mawlids = await db
        .select()
        .from(holidays)
        .where(like(holidays.holidayKey, "2017:moulid%"))
        .orderBy(holidays.holidayDate);
      expect(mawlids.map((row) => row.holidayDate)).toEqual(["2024-09-15", "2025-09-04"]);
    });

    it("stores two holidays that share a date as separate rows", async () => {
      // Patriots' Victory Day and Fasika both fall on 2024-05-05 in Ethiopian 2016.
      await syncEthiopianHolidays(admin, { years: [2016] });

      const sameDay = await db
        .select()
        .from(holidays)
        .where(eq(holidays.holidayDate, "2024-05-05"));
      expect(sameDay.map((row) => row.holidayKey).sort()).toEqual(["2016:fasika", "2016:patriots"]);
    });

    it("does nothing when asked for no years", async () => {
      await expect(syncEthiopianHolidays(admin, { years: [] })).resolves.toEqual({
        years: [],
        inserted: 0,
        updated: 0,
      });
      expect(await autoRows()).toHaveLength(0);
    });

    it("covers this Ethiopian year and the next when no years are given", async () => {
      const expected = await ethiopianYearsToCover(admin);

      const result = await syncEthiopianHolidays(admin);

      expect(result.years).toEqual(expected);
      expect(expected[1]).toBe(expected[0] + 1);
      expect(await autoRows()).toHaveLength(expected.flatMap(ethiopianPublicHolidays).length);
    });
  });

  describe("ethiopianYearsToCover", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("reads the calendar in the organization's timezone, not the server's", async () => {
      vi.useFakeTimers();
      // 23:00 in Addis Ababa on Pagume 5 — still the old Ethiopian year, though UTC
      // and anything west of it would already say otherwise on some clocks.
      vi.setSystemTime(new Date("2026-09-10T20:00:00Z"));
      await expect(ethiopianYearsToCover(admin)).resolves.toEqual([2018, 2019]);

      // 01:30 in Addis Ababa on Meskerem 1 — the new year has begun locally while it is
      // still 2026-09-10 in UTC.
      vi.setSystemTime(new Date("2026-09-10T22:30:00Z"));
      await expect(ethiopianYearsToCover(admin)).resolves.toEqual([2019, 2020]);
    });

    it("falls back to the default timezone when no organization exists", async () => {
      await db.delete(organizations);
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-09-10T22:30:00Z"));

      await expect(ethiopianYearsToCover(admin)).resolves.toEqual([2019, 2020]);
    });
  });

  describe("ensureEthiopianHolidays", () => {
    it("fills an empty table", async () => {
      const result = await ensureEthiopianHolidays(admin);

      expect(result?.inserted).toBeGreaterThan(0);
      expect(await autoRows()).toHaveLength(DEFAULT_ROWS);
    });

    it("does no work once both years are present", async () => {
      await ensureEthiopianHolidays(admin);

      await expect(ensureEthiopianHolidays(admin)).resolves.toBeNull();
    });

    it("fills in a year that is missing", async () => {
      const [currentYear] = await ethiopianYearsToCover(admin);
      await syncEthiopianHolidays(admin, { years: [currentYear] });

      const result = await ensureEthiopianHolidays(admin);

      expect(result?.inserted).toBeGreaterThan(0);
      expect(await autoRows()).toHaveLength(DEFAULT_ROWS);
    });

    it("does not resurrect holidays an admin has taken over", async () => {
      await syncEthiopianHolidays(admin, { years: DEFAULT_YEARS });
      await db.update(holidays).set({ source: "manual" });

      await expect(ensureEthiopianHolidays(admin)).resolves.toMatchObject({ inserted: 0 });
      expect(await autoRows()).toHaveLength(0);
      expect(await db.select().from(holidays)).toHaveLength(DEFAULT_ROWS);
    });
  });

  describe("listHolidays", () => {
    it("generates the holidays on first read, so the dashboard is never empty", async () => {
      const listed = await listHolidays(admin, {});

      expect(listed.filter((holiday) => holiday.source === "auto")).toHaveLength(DEFAULT_ROWS);
      expect(listed.map((holiday) => holiday.holidayDate)).toEqual(
        [...listed.map((holiday) => holiday.holidayDate)].sort(),
      );
    });

    it("generates them even when the caller filters by branch", async () => {
      const branchId = await seedBranch();

      const listed = await listHolidays(admin, { branchId });

      // The generated holidays are org-wide, so a branch filter excludes them from the
      // response — but they must still have been created.
      expect(listed).toHaveLength(0);
      expect(await autoRows()).toHaveLength(DEFAULT_ROWS);
    });

    it("lets a reader without write permission see them", async () => {
      await expect(listHolidays(hr, {})).resolves.toHaveLength(DEFAULT_ROWS);
    });

    it("refuses a caller with no session before it reads anything", async () => {
      await expect(listHolidays(anonymous, {})).rejects.toMatchObject({ status: 401 });
      expect(await autoRows()).toHaveLength(0);
    });
  });

  describe("syncHolidays", () => {
    it("runs the sync for a permitted user", async () => {
      await expect(syncHolidays(admin)).resolves.toMatchObject({ inserted: DEFAULT_ROWS });
    });

    it("refuses a reader who may not create holidays", async () => {
      await expect(syncHolidays(hr)).rejects.toMatchObject({ status: 403 });
      expect(await autoRows()).toHaveLength(0);
    });

    it("refuses a caller with no session", async () => {
      await expect(syncHolidays(anonymous)).rejects.toMatchObject({ status: 401 });
      expect(await autoRows()).toHaveLength(0);
    });
  });

  describe("correcting a generated holiday", () => {
    beforeEach(async () => {
      await syncEthiopianHolidays(admin, { years: DEFAULT_YEARS });
    });

    it("keeps a corrected date through later syncs", async () => {
      // Eid dates are calendar estimates; the observed day can move by one.
      const eid = await rowByKey("2019:eidFitr");

      const corrected = await updateHoliday(admin, {
        id: eid!.id,
        holidayDate: "2027-03-10",
      });

      expect(corrected).toMatchObject({
        holidayDate: "2027-03-10",
        source: "manual",
        holidayKey: "2019:eidFitr",
      });
      await syncEthiopianHolidays(admin, { years: DEFAULT_YEARS });
      await expect(rowByKey("2019:eidFitr")).resolves.toMatchObject({
        holidayDate: "2027-03-10",
        source: "manual",
      });
      expect(await autoRows()).toHaveLength(DEFAULT_ROWS - 1);
    });

    it("keeps a renamed holiday through later syncs", async () => {
      const mawlid = await rowByKey("2019:moulid");

      await updateHoliday(admin, { id: mawlid!.id, name: "Mewulid" });

      await syncEthiopianHolidays(admin, { years: DEFAULT_YEARS });
      await expect(rowByKey("2019:moulid")).resolves.toMatchObject({
        name: "Mewulid",
        source: "manual",
      });
    });

    it("stays generated when the update changes nothing", async () => {
      const meskel = await rowByKey("2019:meskel");

      const updated = await updateHoliday(admin, {
        id: meskel!.id,
        holidayDate: meskel!.holidayDate,
        name: meskel!.name,
      });

      expect(updated).toMatchObject({ source: "auto" });
    });

    it("refuses to narrow a national holiday to one branch", async () => {
      const branchId = await seedBranch();
      const adwa = await rowByKey("2018:adwa");

      await expect(updateHoliday(admin, { id: adwa!.id, branchId })).rejects.toMatchObject({
        status: 400,
      });
      await expect(rowByKey("2018:adwa")).resolves.toMatchObject({ branchId: null });
    });

    it("accepts an explicit org-wide scope, which changes nothing", async () => {
      const adwa = await rowByKey("2018:adwa");

      await expect(updateHoliday(admin, { id: adwa!.id, branchId: null })).resolves.toMatchObject({
        branchId: null,
        source: "auto",
      });
    });

    it("refuses to delete a generated holiday", async () => {
      const gena = await rowByKey("2019:gena");

      await expect(deleteHoliday(admin, { id: gena!.id })).rejects.toMatchObject({ status: 400 });
      await expect(rowByKey("2019:gena")).resolves.toBeDefined();
    });

    it("reports a missing holiday rather than a permission problem", async () => {
      await expect(
        updateHoliday(admin, { id: crypto.randomUUID(), name: "Ghost" }),
      ).rejects.toMatchObject({ status: 404 });
      await expect(deleteHoliday(admin, { id: crypto.randomUUID() })).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe("manual holidays", () => {
    it("are created outside the generated set and stay deletable", async () => {
      const created = await createHoliday(admin, {
        name: "Company day",
        holidayDate: "2026-10-02",
        branchId: null,
      });

      expect(created).toMatchObject({
        source: "manual",
        holidayKey: null,
        ethiopianDate: null,
      });
      await syncEthiopianHolidays(admin, { years: DEFAULT_YEARS });
      await expect(deleteHoliday(admin, { id: created!.id })).resolves.toMatchObject({
        id: created!.id,
      });
    });

    it("may share a date with a generated holiday", async () => {
      await syncEthiopianHolidays(admin, { years: DEFAULT_YEARS });
      const branchId = await seedBranch();

      const created = await createHoliday(admin, {
        name: "Branch closure",
        holidayDate: ADWA,
        branchId,
      });

      expect(created).toMatchObject({ holidayDate: ADWA, branchId });
      expect(await db.select().from(holidays).where(eq(holidays.holidayDate, ADWA))).toHaveLength(
        2,
      );
    });

    it("are untouched by a sync", async () => {
      const created = await createHoliday(admin, {
        name: "Company day",
        holidayDate: "2026-10-02",
        branchId: null,
      });

      await syncEthiopianHolidays(admin, { years: DEFAULT_YEARS });

      await expect(
        db.select().from(holidays).where(eq(holidays.id, created!.id)).limit(1),
      ).resolves.toMatchObject([{ name: "Company day", source: "manual" }]);
    });
  });

  describe("the rest of the system sees a generated holiday", () => {
    beforeEach(async () => {
      await syncEthiopianHolidays(admin, { years: [2018] });
    });

    it("owes no shift on it, so attendance derives it as a holiday", async () => {
      const branchId = await seedBranch();
      const employeeId = await seedEmployee(branchId);

      const adwa = await loadDayContext(admin, { employeeId, attendanceDate: ADWA });
      const ordinaryMonday = await loadDayContext(admin, {
        employeeId,
        attendanceDate: "2026-03-09",
      });

      expect(adwa).toMatchObject({
        dayType: "holiday",
        dayWindow: { expectedStart: null, expectedEnd: null },
      });
      expect(ordinaryMonday.dayType).toBe("working_day");
      expect(ordinaryMonday.dayWindow.expectedStart).not.toBeNull();
    });

    it("silences the notification scans for every branch", async () => {
      const first = await seedBranch("HQ");
      const second = await seedBranch("Annex");

      const onHoliday = await loadBranchesOnHoliday(
        admin,
        new Map([
          [first, ADWA],
          [second, ADWA],
        ]),
      );

      expect([...onHoliday.keys()].sort()).toEqual([first, second].sort());
      expect(onHoliday.get(first)).toMatchObject({ name: "Victory of Adwa" });
      await expect(loadBranchesOnHoliday(admin, new Map([[first, "2026-03-09"]]))).resolves.toEqual(
        new Map(),
      );
    });

    it("drops it from the days a report expects", async () => {
      const branchId = await seedBranch();
      const employeeId = await seedEmployee(branchId);
      await db.insert(attendanceDays).values({
        employeeId,
        attendanceDate: "2026-03-03",
        dayType: "working_day",
        outcome: "present",
        workedMinutes: 480,
      });

      const report = await getAttendanceSummary(
        admin,
        attendanceSummaryInput.parse({ from: ADWA, to: ADWA_WEEK_END }),
      );

      // Monday is Adwa, Saturday and Sunday are not worked: four days remain.
      expect(report.rows[0]).toMatchObject({ expectedDays: 4 });
    });

    it("counts a national and a branch holiday on the same day only once", async () => {
      const branchId = await seedBranch();
      const employeeId = await seedEmployee(branchId);
      await createHoliday(admin, { name: "Branch closure", holidayDate: ADWA, branchId });
      await db.insert(attendanceDays).values({
        employeeId,
        attendanceDate: "2026-03-03",
        dayType: "working_day",
        outcome: "present",
        workedMinutes: 480,
      });

      const report = await getAttendanceSummary(
        admin,
        attendanceSummaryInput.parse({ from: ADWA, to: ADWA_WEEK_END }),
      );

      expect(report.rows[0]).toMatchObject({ expectedDays: 4 });
    });
  });

  it("leaves generated rows org-wide and keyed, and manual rows neither", async () => {
    await syncEthiopianHolidays(admin, { years: DEFAULT_YEARS });
    await createHoliday(admin, { name: "Company day", holidayDate: "2026-10-02", branchId: null });

    const generated = await db
      .select()
      .from(holidays)
      .where(and(eq(holidays.source, "auto"), isNull(holidays.branchId)));
    const manual = await db
      .select()
      .from(holidays)
      .where(and(eq(holidays.source, "manual"), isNull(holidays.holidayKey)));

    expect(generated).toHaveLength(DEFAULT_ROWS);
    expect(generated.every((row) => row.holidayKey && row.ethiopianDate)).toBe(true);
    expect(manual).toHaveLength(1);
  });
});
