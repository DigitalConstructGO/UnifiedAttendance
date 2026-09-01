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
  createClientDocument,
  createClientType,
  createEmployee,
  createIndustry,
  createInvoice,
  deleteInvoice,
  deleteInvoicePayment,
  getInvoice,
  issueInvoice,
  recordInvoicePayment,
  updateInvoicePayment,
  voidInvoice,
} from "../../../src/index";
import { resetDatabase, testContext } from "../../fixtures";

const context = testContext("admin");

let branchId: string;
let ownerEmployeeId: string;
let clientId: string;

async function seedBillingFixture() {
  await resetDatabase();
  await db.insert(user).values({
    id: "admin",
    name: "Admin",
    email: "admin@example.test",
    emailVerified: true,
  });
  const [adminRole] = await db.select().from(roles).where(eq(roles.name, "Admin")).limit(1);
  await db.insert(userRoles).values({ userId: "admin", roleId: adminRole!.id });
  await db.insert(organizations).values({
    name: "Abyssiniya AI",
    code: "ABY",
    timezone: "Africa/Addis_Ababa",
  });
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

describe("deleteInvoice", () => {
  beforeEach(seedBillingFixture);

  it("deletes a draft invoice with nothing attached to it", async () => {
    const invoice = await createInvoice(context, {
      clientId,
      branchId,
      currency: "ETB",
      totalAmount: "50000.00",
    });

    const result = await deleteInvoice(context, { id: invoice.invoice.id });
    expect(result).toEqual({ id: invoice.invoice.id });
  });

  it("refuses to delete an invoice that has a payment recorded", async () => {
    const invoice = await createInvoice(context, {
      clientId,
      branchId,
      currency: "ETB",
      totalAmount: "50000.00",
    });
    await issueInvoice(context, {
      id: invoice.invoice.id,
      issuedOn: "2026-07-20",
      dueOn: "2026-08-15",
    });
    await recordInvoicePayment(context, {
      invoiceId: invoice.invoice.id,
      amount: "20000.00",
      currency: "ETB",
      paidOn: "2026-07-25",
      recordedByEmployeeId: ownerEmployeeId,
    });

    await expect(deleteInvoice(context, { id: invoice.invoice.id })).rejects.toThrow(
      /has payments recorded/i,
    );
  });

  it("refuses to delete an invoice that has a document linked to it", async () => {
    const invoice = await createInvoice(context, {
      clientId,
      branchId,
      currency: "ETB",
      totalAmount: "50000.00",
    });
    await createClientDocument(context, {
      clientId,
      invoiceId: invoice.invoice.id,
      kind: "invoice",
      fileName: "receipt.pdf",
      contentType: "application/pdf",
      contentLength: 10_000,
      uploadedByEmployeeId: ownerEmployeeId,
    });

    await expect(deleteInvoice(context, { id: invoice.invoice.id })).rejects.toThrow(
      /has documents linked to it/i,
    );
  });
});

describe("invoice payment lifecycle", () => {
  beforeEach(seedBillingFixture);

  async function issuedInvoiceWithPayment(amount = "20000.00") {
    const invoice = await createInvoice(context, {
      clientId,
      branchId,
      currency: "ETB",
      totalAmount: "50000.00",
    });
    await issueInvoice(context, {
      id: invoice.invoice.id,
      issuedOn: "2026-07-20",
      dueOn: "2026-08-15",
    });
    const payment = await recordInvoicePayment(context, {
      invoiceId: invoice.invoice.id,
      amount,
      currency: "ETB",
      paidOn: "2026-07-25",
      recordedByEmployeeId: ownerEmployeeId,
    });
    return { invoiceId: invoice.invoice.id, paymentId: payment.id };
  }

  it("edits a payment and the invoice balance follows", async () => {
    const { invoiceId, paymentId } = await issuedInvoiceWithPayment();

    const updated = await updateInvoicePayment(context, {
      id: paymentId,
      amount: "30000.00",
      method: "Bank transfer",
    });
    expect(updated.amount).toBe("30000.00");
    expect(updated.method).toBe("Bank transfer");

    const details = await getInvoice(context, { id: invoiceId });
    expect(details.paymentSummary.paidAmount).toBe("30000.00");
    expect(details.paymentSummary.outstandingAmount).toBe("20000.00");
  });

  it("refuses an edit that would overpay the invoice", async () => {
    const { paymentId } = await issuedInvoiceWithPayment();

    await expect(
      updateInvoicePayment(context, { id: paymentId, amount: "50001.00" }),
    ).rejects.toThrow(/cannot exceed the outstanding/i);
  });

  it("archives a payment, reopening the invoice balance", async () => {
    const { invoiceId, paymentId } = await issuedInvoiceWithPayment("50000.00");

    let details = await getInvoice(context, { id: invoiceId });
    expect(details.paymentSummary.presentationStatus).toBe("paid");

    const archived = await archiveInvoicePayment(context, { id: paymentId });
    expect(archived.archivedAt).not.toBeNull();

    details = await getInvoice(context, { id: invoiceId });
    expect(details.paymentSummary.paidAmount).toBe("0.00");
    expect(details.paymentSummary.outstandingAmount).toBe("50000.00");
    expect(details.paymentSummary.payments).toHaveLength(0);
    expect(details.paymentSummary.archivedPayments).toHaveLength(1);
  });

  it("refuses to archive a payment twice", async () => {
    const { paymentId } = await issuedInvoiceWithPayment();
    await archiveInvoicePayment(context, { id: paymentId });

    await expect(archiveInvoicePayment(context, { id: paymentId })).rejects.toThrow(
      /already archived/i,
    );
  });

  it("refuses to edit an archived payment", async () => {
    const { paymentId } = await issuedInvoiceWithPayment();
    await archiveInvoicePayment(context, { id: paymentId });

    await expect(updateInvoicePayment(context, { id: paymentId, amount: "10.00" })).rejects.toThrow(
      /archived payment cannot be edited/i,
    );
  });

  it("refuses to delete a payment that is not archived", async () => {
    const { paymentId } = await issuedInvoiceWithPayment();

    await expect(deleteInvoicePayment(context, { id: paymentId })).rejects.toThrow(
      /archive this payment first/i,
    );
  });

  it("deletes an archived payment", async () => {
    const { invoiceId, paymentId } = await issuedInvoiceWithPayment();
    await archiveInvoicePayment(context, { id: paymentId });

    const result = await deleteInvoicePayment(context, { id: paymentId });
    expect(result).toEqual({ id: paymentId });

    const details = await getInvoice(context, { id: invoiceId });
    expect(details.paymentSummary.payments).toHaveLength(0);
    expect(details.paymentSummary.archivedPayments).toHaveLength(0);
  });

  it("lets an invoice be voided once every payment is archived", async () => {
    const { invoiceId, paymentId } = await issuedInvoiceWithPayment();

    await expect(voidInvoice(context, { id: invoiceId })).rejects.toThrow(/cannot be voided/i);

    await archiveInvoicePayment(context, { id: paymentId });
    const voided = await voidInvoice(context, { id: invoiceId });
    expect(voided.invoice.lifecycleStatus).toBe("void");
  });
});
