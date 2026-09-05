import { describe, expect, it } from "vitest";

import { toEC } from "kenat";

import { ethiopianPublicHolidays, ethiopianYearOf } from "../../../src/modules/holidays/ethiopian";

/** Feasts pinned to a fixed Ethiopian day, whatever the Gregorian date works out to be. */
const FIXED_ETHIOPIAN_DAYS: Record<string, string> = {
  enkutatash: "01-01",
  meskel: "01-17",
  beherbehereseb: "03-29",
  gena: "04-29",
  timket: "05-11",
  martyrsDay: "06-12",
  adwa: "06-23",
  labour: "08-23",
  patriots: "08-27",
};

const MOVABLE_KEYS = ["fasika", "siklet", "eidFitr", "eidAdha", "moulid"];

/** Every Ethiopian year the suite sweeps. 2019 and 2015 are leap years (year % 4 === 3). */
const SWEPT_YEARS = Array.from({ length: 26 }, (_, index) => 2005 + index);

function kenatKeyOf(key: string) {
  return key.slice(key.indexOf(":") + 1).split("#")[0]!;
}

function daysBetween(from: string, to: string) {
  return (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
}

describe("ethiopianYearOf", () => {
  it("maps a Gregorian date to the Ethiopian year it falls in", () => {
    expect(ethiopianYearOf("2026-01-01")).toBe(2018); // mid-year, Tahsas 2018
    expect(ethiopianYearOf("2027-01-07")).toBe(2019); // Genna, mid-year
  });

  it("rolls over on Enkutatash, not on 1 January", () => {
    expect(ethiopianYearOf("2026-09-10")).toBe(2018); // Pagume 5, the last day of 2018
    expect(ethiopianYearOf("2026-09-11")).toBe(2019); // Meskerem 1
  });

  it("accounts for the extra Pagume day after an Ethiopian leap year", () => {
    // 2015 is a leap year, so it has a Pagume 6 and 2016 opens a day later than usual.
    expect(ethiopianYearOf("2023-09-11")).toBe(2015);
    expect(ethiopianYearOf("2023-09-12")).toBe(2016);
  });
});

describe("ethiopianPublicHolidays", () => {
  const holidays2019 = ethiopianPublicHolidays(2019);
  const byKenatKey = new Map(holidays2019.map((holiday) => [kenatKeyOf(holiday.key), holiday]));

  it("returns the fourteen national public holidays", () => {
    expect(holidays2019).toHaveLength(14);
    expect([...byKenatKey.keys()].sort()).toEqual(
      [...Object.keys(FIXED_ETHIOPIAN_DAYS), ...MOVABLE_KEYS].sort(),
    );
  });

  it("converts fixed feasts to their Gregorian dates", () => {
    expect(byKenatKey.get("enkutatash")).toMatchObject({
      key: "2019:enkutatash",
      name: "Ethiopian New Year (Enkutatash)",
      holidayDate: "2026-09-11",
      ethiopianDate: "2019-01-01",
    });
    expect(byKenatKey.get("gena")?.holidayDate).toBe("2027-01-07");
    expect(byKenatKey.get("timket")?.holidayDate).toBe("2027-01-19");
    expect(byKenatKey.get("adwa")?.holidayDate).toBe("2027-03-02");
    expect(byKenatKey.get("meskel")?.holidayDate).toBe("2026-09-27");
  });

  it("places the movable feasts from Bahire Hasab and the Islamic calendar", () => {
    expect(byKenatKey.get("siklet")?.holidayDate).toBe("2027-04-30");
    expect(byKenatKey.get("fasika")?.holidayDate).toBe("2027-05-02");
    expect(byKenatKey.get("eidFitr")?.holidayDate).toBe("2027-03-09");
    expect(byKenatKey.get("eidAdha")?.holidayDate).toBe("2027-05-16");
    expect(byKenatKey.get("moulid")?.holidayDate).toBe("2027-08-14");
  });

  it("moves the movable feasts from one year to the next", () => {
    const holidays2018 = ethiopianPublicHolidays(2018);
    for (const kenatKey of MOVABLE_KEYS) {
      const previous = holidays2018.find((holiday) => kenatKeyOf(holiday.key) === kenatKey);
      expect(previous?.holidayDate).not.toBe(byKenatKey.get(kenatKey)?.holidayDate);
    }
    expect(holidays2018.find((holiday) => holiday.key === "2018:fasika")?.holidayDate).toBe(
      "2026-04-12",
    );
  });

  it("orders holidays by Gregorian date", () => {
    const dates = holidays2019.map((holiday) => holiday.holidayDate);
    expect(dates).toEqual([...dates].sort());
  });

  it("keeps both occurrences when a Muslim holiday falls twice in one Ethiopian year", () => {
    // The Islamic year is ~11 days shorter than the Ethiopian one, so a feast occasionally
    // lands twice inside the same Ethiopian year. Both are real public holidays and both
    // must survive, under distinct keys.
    const mawlidTwice = ethiopianPublicHolidays(2017);
    expect(mawlidTwice).toHaveLength(15);
    const mawlids = mawlidTwice.filter((holiday) => kenatKeyOf(holiday.key) === "moulid");
    expect(mawlids.map((holiday) => holiday.key)).toEqual(["2017:moulid", "2017:moulid#2"]);
    expect(mawlids.map((holiday) => holiday.holidayDate)).toEqual(["2024-09-15", "2025-09-04"]);

    expect(
      ethiopianPublicHolidays(2009)
        .filter((holiday) => kenatKeyOf(holiday.key) === "eidAdha")
        .map((holiday) => holiday.key),
    ).toEqual(["2009:eidAdha", "2009:eidAdha#2"]);
  });

  describe.each(SWEPT_YEARS)("Ethiopian year %i", (year) => {
    const holidays = ethiopianPublicHolidays(year);

    it("gives every holiday a unique key prefixed with its Ethiopian year", () => {
      const keys = holidays.map((holiday) => holiday.key);
      expect(new Set(keys).size).toBe(keys.length);
      expect(keys.every((key) => key.startsWith(`${year}:`))).toBe(true);
    });

    it("emits well-formed dates that round-trip back to the Ethiopian date", () => {
      for (const holiday of holidays) {
        expect(holiday.holidayDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(holiday.ethiopianDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(holiday.name).not.toHaveLength(0);

        const [gregorianYear, month, day] = holiday.holidayDate.split("-").map(Number);
        const roundTripped = toEC(gregorianYear!, month!, day!);
        expect(
          `${roundTripped.year}-${String(roundTripped.month).padStart(2, "0")}-${String(
            roundTripped.day,
          ).padStart(2, "0")}`,
        ).toBe(holiday.ethiopianDate);
        expect(holiday.ethiopianDate.startsWith(`${year}-`)).toBe(true);
      }
    });

    it("holds every fixed feast on its fixed Ethiopian day", () => {
      for (const [kenatKey, ethiopianDay] of Object.entries(FIXED_ETHIOPIAN_DAYS)) {
        const holiday = holidays.find((candidate) => kenatKeyOf(candidate.key) === kenatKey);
        expect(holiday?.ethiopianDate).toBe(`${year}-${ethiopianDay}`);
      }
    });

    it("puts Fasika two days after Good Friday", () => {
      const siklet = holidays.find((holiday) => kenatKeyOf(holiday.key) === "siklet");
      const fasika = holidays.find((holiday) => kenatKeyOf(holiday.key) === "fasika");
      expect(daysBetween(siklet!.holidayDate, fasika!.holidayDate)).toBe(2);
    });
  });

  it("never reuses a key between adjacent years", () => {
    const thisYear = ethiopianPublicHolidays(2019).map((holiday) => holiday.key);
    const nextYear = ethiopianPublicHolidays(2020).map((holiday) => holiday.key);
    expect(thisYear.filter((key) => nextYear.includes(key))).toEqual([]);
  });

  it("is deterministic", () => {
    expect(ethiopianPublicHolidays(2019)).toEqual(holidays2019);
  });
});
