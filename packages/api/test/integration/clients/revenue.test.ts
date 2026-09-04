import { beforeEach, describe, expect, it } from "vitest";

import { eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import {
  branches,
  organizations,
  roles,
  user,
  userRoles,
} from "@UnifiedAttendance/db/schema/index";

import {
  archiveInvoicePayment,
  createClient,
  createClientType,
  createEmployee,
  createIndustry,
  createInvoice,
  getRevenueReport,
  issueInvoice,
  recordInvoicePayment,
} from "../../../src/index";
import { resetDatabase, testContext } from "../../fixtures";

const context = testContext("admin");

let branchId: string;
let clientId: string;
let ownerEmployeeId: string;

async function seed() {
  await resetDatabase();
  await db
    .insert(user)
    .values({ id: "admin", name: "Admin", email: "admin@example.test", emailVerified: true });
  const [adminRole] = await db.select().from(roles).where(eq(roles.name, "Admin")).limit(1);
  await db.insert(userRoles).values({ userId: "admin", roleId: adminRole!.id });
  await db
    .insert(organizations)
    .values({ name: "Abyssiniya AI", code: "ABY", timezone: "Africa/Addis_Ababa" });
  const [branch] = await db.insert(branches).values({ name: "Addis HQ", code: "HQ" }).returning();
  branchId = branch!.id;

  const owner = await createEmployee(context, {
    person: { firstName: "Bethlehem", lastName: "Assefa" },
    employee: {
      branchId,
      employeeCode: "EMP-001",
      employmentType: "permanent",
      hireDate: "2026-01-01",
    },
  });
  ownerEmployeeId = owner.employee.id;

  const industry = await createIndustry(context, { name: "Banking" });
  const clientType = await createClientType(context, { name: "Enterprise" });
  const client = await createClient(context, {
    branchId,
    ownerEmployeeId,
    legalName: "Commercial Bank of Ethiopia",
    industryId: industry.id,
    clientTypeId: clientType.id,
  });
  clientId = client.client.id;
}

async function issuedInvoice(amount: string, issuedOn: string, dueOn: string, currency = "ETB") {
  const invoice = await createInvoice(context, {
    clientId,
    branchId,
    currency,
    totalAmount: amount,
  });
  await issueInvoice(context, { id: invoice.invoice.id, issuedOn, dueOn });
  return invoice.invoice.id;
}

type Report = Awaited<ReturnType<typeof getRevenueReport>>;

/** The org-wide total for one period. */
function bucket(report: Report, period: string) {
  return report.periods.find((entry) => entry.period === period);
}

/** One client's row, by legal name. */
function clientRow(report: Report, legalName: string) {
  return report.clients.find((row) => row.client.legalName === legalName);
}

/** One cell of the grid: a client's figure in a single period. */
function cell(report: Report, legalName: string, period: string) {
  return clientRow(report, legalName)?.byPeriod.find((entry) => entry.period === period);
}

describe("Client revenue by period", () => {
  beforeEach(seed);

  it("books an invoice under its issue month and its payment under the month it was paid", async () => {
    const invoiceId = await issuedInvoice("50000.00", "2026-01-20", "2026-02-20");
    await recordInvoicePayment(context, {
      invoiceId,
      amount: "50000.00",
      currency: "ETB",
      paidOn: "2026-03-05",
      recordedByEmployeeId: ownerEmployeeId,
    });

    const report = await getRevenueReport(context, {
      grain: "month",
      from: "2026-01-01",
      to: "2026-12-31",
    });

    expect(bucket(report, "2026-01")?.invoiced.amount).toBe("50000.00");
    expect(bucket(report, "2026-01")?.collected.amount).toBe("0.00");
    expect(bucket(report, "2026-03")?.collected.amount).toBe("50000.00");
    expect(bucket(report, "2026-03")?.invoiced.amount).toBe("0.00");
  });

  it("leaves draft invoices out of invoiced revenue entirely", async () => {
    await createInvoice(context, {
      clientId,
      branchId,
      currency: "ETB",
      totalAmount: "12000.00",
    });

    const report = await getRevenueReport(context, {
      grain: "month",
      from: "2026-01-01",
      to: "2026-12-31",
    });

    expect(report.totals.invoiced.amount).toBe("0.00");
    // A draft puts no client on the grid at all.
    expect(report.clients).toHaveLength(0);
  });

  it("stops counting an archived payment as collected", async () => {
    const invoiceId = await issuedInvoice("50000.00", "2026-07-20", "2026-08-15");
    const payment = await recordInvoicePayment(context, {
      invoiceId,
      amount: "50000.00",
      currency: "ETB",
      paidOn: "2026-07-25",
      recordedByEmployeeId: ownerEmployeeId,
    });
    await archiveInvoicePayment(context, { id: payment.id });

    const report = await getRevenueReport(context, {
      grain: "month",
      from: "2026-01-01",
      to: "2026-12-31",
    });

    expect(report.totals.collected.amount).toBe("0.00");
    // The invoice itself is untouched — only the receipt went away.
    expect(report.totals.invoiced.amount).toBe("50000.00");
  });

  it("reports each currency separately rather than giving up on a mixed-currency client", async () => {
    await issuedInvoice("50000.00", "2026-04-10", "2026-05-10", "ETB");
    await issuedInvoice("1200.00", "2026-04-18", "2026-05-18", "USD");

    const report = await getRevenueReport(context, {
      grain: "month",
      from: "2026-01-01",
      to: "2026-12-31",
    });

    expect(bucket(report, "2026-04")?.invoiced.breakdown).toEqual([
      { currency: "ETB", amount: "50000.00" },
      { currency: "USD", amount: "1200.00" },
    ]);
    // No single figure can represent two currencies, so `amount` stays null
    // while the per-currency breakdown carries the real numbers.
    expect(bucket(report, "2026-04")?.invoiced.amount).toBeNull();
  });

  it("groups weeks Monday-first, including across a year boundary", async () => {
    // 2026-12-31 is a Thursday; 2027-01-01 a Friday. Both fall in the week
    // starting Monday 2026-12-28.
    await issuedInvoice("1000.00", "2026-12-31", "2027-01-31");
    await issuedInvoice("2000.00", "2027-01-01", "2027-02-01");

    const report = await getRevenueReport(context, {
      grain: "week",
      from: "2026-12-01",
      to: "2027-01-31",
    });

    expect(bucket(report, "2026-12-28")?.invoiced.amount).toBe("3000.00");
    expect(bucket(report, "2026-12-28")?.end).toBe("2027-01-03");
  });

  it("totals a whole year into one bucket", async () => {
    await issuedInvoice("1000.00", "2026-02-11", "2026-03-11");
    await issuedInvoice("2500.00", "2026-09-04", "2026-10-04");

    const report = await getRevenueReport(context, {
      grain: "year",
      from: "2026-01-01",
      to: "2026-12-31",
    });

    expect(bucket(report, "2026")?.invoiced.amount).toBe("3500.00");
    expect(bucket(report, "2026")?.start).toBe("2026-01-01");
    expect(bucket(report, "2026")?.end).toBe("2026-12-31");
  });

  it("excludes anything outside the requested window", async () => {
    await issuedInvoice("9000.00", "2025-11-04", "2025-12-04");

    const report = await getRevenueReport(context, {
      grain: "month",
      from: "2026-01-01",
      to: "2026-12-31",
    });

    expect(report.totals.invoiced.amount).toBe("0.00");
  });

  it("spans every period in the window, including ones with no revenue", async () => {
    await issuedInvoice("1000.00", "2026-02-11", "2026-03-11");

    const report = await getRevenueReport(context, {
      grain: "month",
      from: "2026-01-01",
      to: "2026-04-30",
    });

    // A gap in a revenue column means zero, and the grid still has to draw it.
    expect(report.periods.map((entry) => entry.period)).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
    ]);
    expect(bucket(report, "2026-01")?.invoiced.amount).toBe("0.00");
  });

  it("gives every client a cell in every period, so rows line up with columns", async () => {
    await issuedInvoice("1000.00", "2026-01-15", "2026-02-15");

    const report = await getRevenueReport(context, {
      grain: "month",
      from: "2026-01-01",
      to: "2026-03-31",
    });

    const row = clientRow(report, "Commercial Bank of Ethiopia");
    expect(row?.byPeriod).toHaveLength(report.periods.length);
    expect(cell(report, "Commercial Bank of Ethiopia", "2026-01")?.invoiced.amount).toBe("1000.00");
    expect(cell(report, "Commercial Bank of Ethiopia", "2026-02")?.invoiced.amount).toBe("0.00");
  });

  it("splits revenue across clients and totals each period down the column", async () => {
    await issuedInvoice("1000.00", "2026-01-15", "2026-02-15");

    const second = await createClient(context, {
      branchId,
      ownerEmployeeId,
      legalName: "Ethio Telecom",
      industryId: (await createIndustry(context, { name: "Telecom" })).id,
      clientTypeId: (await createClientType(context, { name: "Government" })).id,
    });
    const otherInvoice = await createInvoice(context, {
      clientId: second.client.id,
      branchId,
      currency: "ETB",
      totalAmount: "4000.00",
    });
    await issueInvoice(context, {
      id: otherInvoice.invoice.id,
      issuedOn: "2026-01-22",
      dueOn: "2026-02-22",
    });

    const report = await getRevenueReport(context, {
      grain: "month",
      from: "2026-01-01",
      to: "2026-01-31",
    });

    expect(cell(report, "Commercial Bank of Ethiopia", "2026-01")?.invoiced.amount).toBe("1000.00");
    expect(cell(report, "Ethio Telecom", "2026-01")?.invoiced.amount).toBe("4000.00");
    expect(bucket(report, "2026-01")?.invoiced.amount).toBe("5000.00");
    expect(report.totals.invoiced.amount).toBe("5000.00");
  });

  it("ranks the biggest earner first on the measure asked for", async () => {
    // CBE invoices more; Ethio Telecom actually pays. The ordering must follow
    // whichever measure the caller selected.
    await issuedInvoice("9000.00", "2026-01-15", "2026-02-15");

    const second = await createClient(context, {
      branchId,
      ownerEmployeeId,
      legalName: "Ethio Telecom",
      industryId: (await createIndustry(context, { name: "Telecom" })).id,
      clientTypeId: (await createClientType(context, { name: "Government" })).id,
    });
    const otherInvoice = await createInvoice(context, {
      clientId: second.client.id,
      branchId,
      currency: "ETB",
      totalAmount: "3000.00",
    });
    await issueInvoice(context, {
      id: otherInvoice.invoice.id,
      issuedOn: "2026-01-10",
      dueOn: "2026-02-10",
    });
    await recordInvoicePayment(context, {
      invoiceId: otherInvoice.invoice.id,
      amount: "3000.00",
      currency: "ETB",
      paidOn: "2026-01-20",
      recordedByEmployeeId: ownerEmployeeId,
    });

    const window = { grain: "month", from: "2026-01-01", to: "2026-01-31" } as const;

    const byInvoiced = await getRevenueReport(context, { ...window, revenueMeasure: "invoiced" });
    expect(byInvoiced.clients[0]?.client.legalName).toBe("Commercial Bank of Ethiopia");

    const byCollected = await getRevenueReport(context, { ...window, revenueMeasure: "collected" });
    expect(byCollected.clients[0]?.client.legalName).toBe("Ethio Telecom");
  });

  it("measures the window against the comparison window the caller supplies", async () => {
    await issuedInvoice("4000.00", "2025-12-10", "2026-01-10");
    await issuedInvoice("1000.00", "2026-01-15", "2026-02-15");

    const report = await getRevenueReport(context, {
      grain: "month",
      from: "2026-01-01",
      to: "2026-01-31",
      compareFrom: "2025-12-01",
      compareTo: "2025-12-31",
    });

    expect(report.totals.invoiced.amount).toBe("1000.00");
    expect(report.previous?.totals.invoiced.amount).toBe("4000.00");
    expect(clientRow(report, "Commercial Bank of Ethiopia")?.previousTotal.invoiced.amount).toBe(
      "4000.00",
    );
  });

  it("still lists a client that earned only in the comparison window, as a drop to zero", async () => {
    await issuedInvoice("4000.00", "2025-12-10", "2026-01-10");

    const report = await getRevenueReport(context, {
      grain: "month",
      from: "2026-01-01",
      to: "2026-01-31",
      compareFrom: "2025-12-01",
      compareTo: "2025-12-31",
    });

    const row = clientRow(report, "Commercial Bank of Ethiopia");
    expect(row?.total.invoiced.amount).toBe("0.00");
    expect(row?.previousTotal.invoiced.amount).toBe("4000.00");
  });

  it("reports no comparison at all when none was asked for", async () => {
    await issuedInvoice("1000.00", "2026-01-15", "2026-02-15");

    const report = await getRevenueReport(context, {
      grain: "month",
      from: "2026-01-01",
      to: "2026-01-31",
    });

    expect(report.previous).toBeNull();
  });
});
