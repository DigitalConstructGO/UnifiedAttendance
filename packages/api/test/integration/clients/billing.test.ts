import { beforeEach, describe, expect, it } from "vitest";

import { eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import { branches, organizations, roles, user, userRoles } from "@UnifiedAttendance/db/schema/index";

import {
  createClient,
  createClientDocument,
  createClientType,
  createEmployee,
  createIndustry,
  createInvoice,
  deleteInvoice,
  issueInvoice,
  recordInvoicePayment,
} from "../../../src/index";
import { resetDatabase, testContext } from "../../fixtures";

const context = testContext("admin");

describe("deleteInvoice", () => {
  let branchId: string;
  let ownerEmployeeId: string;
  let clientId: string;

  beforeEach(async () => {
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
  });

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
