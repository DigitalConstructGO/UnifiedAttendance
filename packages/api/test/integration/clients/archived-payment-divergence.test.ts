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
  getClientProfile,
  getInvoice,
  issueInvoice,
  listClients,
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

/** Issue a 50,000 ETB invoice due 2026-08-15, pay it in full, then archive the payment. */
async function fullyPaidThenArchived() {
  const invoice = await createInvoice(context, {
    clientId,
    branchId,
    currency: "ETB",
    totalAmount: "50000.00",
  });
  const invoiceId = invoice.invoice.id;
  await issueInvoice(context, { id: invoiceId, issuedOn: "2026-07-20", dueOn: "2026-08-15" });
  const payment = await recordInvoicePayment(context, {
    invoiceId,
    amount: "50000.00",
    currency: "ETB",
    paidOn: "2026-07-25",
    recordedByEmployeeId: ownerEmployeeId,
  });
  await archiveInvoicePayment(context, { id: payment.id });
  return { invoiceId };
}

describe("an archived Invoice Payment across every reader", () => {
  beforeEach(seed);

  it("reopens the balance in the billing view (known good)", async () => {
    const { invoiceId } = await fullyPaidThenArchived();
    const details = await getInvoice(context, { id: invoiceId });
    expect(details.paymentSummary.outstandingAmount).toBe("50000.00");
  });

  it("stops counting toward Collected Revenue in the directory row", async () => {
    await fullyPaidThenArchived();
    const page = await listClients(context, {});
    const row = page.items.find((item) => item.client.id === clientId);
    expect(row?.collectedRevenue.amount).toBe("0.00");
  });

  it("reopens the outstanding balance in the directory row", async () => {
    await fullyPaidThenArchived();
    const page = await listClients(context, {});
    const row = page.items.find((item) => item.client.id === clientId);
    expect(row?.outstanding.amount).toBe("50000.00");
  });

  it("makes the invoice overdue again in Client Health", async () => {
    await fullyPaidThenArchived();
    const profile = await getClientProfile(context, { id: clientId, asOf: "2026-09-01" });
    expect(profile.health.reasons).toContain("overdue_invoice");
  });
});
