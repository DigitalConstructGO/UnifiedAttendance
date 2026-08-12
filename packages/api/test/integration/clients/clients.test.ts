import { beforeEach, describe, expect, it } from "vitest";

import { eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import {
  branches,
  invoices,
  organizations,
  roles,
  user,
  userRoles,
} from "@UnifiedAttendance/db/schema/index";

import {
  archiveClient,
  archiveClientContact,
  archiveClientNote,
  archiveProject,
  deleteCrmActivity,
  deleteProject,
  restoreProject,
  createClient,
  createClientContact,
  createCommercialContract,
  createClientType,
  createEmployee,
  createIndustry,
  createInvoice,
  createClientNote,
  createCrmActivity,
  createClientDocument,
  createClientDocumentVersion,
  createPipelineStage,
  createOpportunity,
  createProject,
  convertOpportunity,
  getClient,
  getClientProfile,
  getClientTimeline,
  getClientOverview,
  listClients,
  listClientOwnerAssignments,
  listClientContacts,
  listCommercialContracts,
  listPipelineStages,
  listOpportunityStageTransitions,
  listProjects,
  listInvoices,
  listClientNotes,
  listCrmActivities,
  listClientDocuments,
  listClientAuditEntries,
  updateIndustry,
  updateClient,
  updateClientNote,
  updateClientContact,
  updateCommercialContract,
  updateCrmActivity,
  updateInvoice,
  updateOpportunity,
  transitionOpportunityStage,
  issueInvoice,
  recordInvoicePayment,
  updateOrganization,
  updateProject,
  voidInvoice,
} from "../../../src/index";
import { resetDatabase, testContext } from "../../fixtures";

const context = testContext("admin");

describe("clients", () => {
  let branchId: string;
  let ownerEmployeeId: string;

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
  });

  it("creates a client with a generated permanent code and initial account owner", async () => {
    const industry = await createIndustry(context, { name: "Banking" });
    const clientType = await createClientType(context, { name: "Enterprise" });

    const created = await createClient(context, {
      branchId,
      ownerEmployeeId,
      legalName: "Commercial Bank of Ethiopia",
      industryId: industry.id,
      clientTypeId: clientType.id,
      phone: "+251911234002",
      email: "vendors@cbe.com.et",
    });

    expect(created.client.clientCode).toMatch(/^CLI-\d{4}-000001$/);
    expect(created.client.relationshipStartedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(created.ownerAssignment).toMatchObject({
      clientId: created.client.id,
      ownerEmployeeId,
      effectiveTo: null,
    });

    const retrieved = await getClient(context, { id: created.client.id });
    expect(retrieved).toMatchObject({
      client: {
        id: created.client.id,
        legalName: "Commercial Bank of Ethiopia",
        phone: "+251911234002",
      },
      branch: { id: branchId, name: "Addis HQ" },
      industry: { id: industry.id, name: "Banking" },
      clientType: { id: clientType.id, name: "Enterprise" },
      owner: { employee: { id: ownerEmployeeId }, person: { firstName: "Bethlehem" } },
    });

    const directory = await listClients(context, {});
    expect(directory.items).toHaveLength(1);
    expect(directory.total).toBe(1);
    expect(directory.items[0]?.client.id).toBe(created.client.id);
  });

  it("creates a client from typed industry and client type names, reusing matches", async () => {
    const created = await createClient(context, {
      branchId,
      ownerEmployeeId,
      legalName: "Habesha Breweries",
      industry: "Beverages",
      clientType: "Retainer",
    });
    const retrieved = await getClient(context, { id: created.client.id });
    expect(retrieved.industry.name).toBe("Beverages");
    expect(retrieved.clientType.name).toBe("Retainer");

    // Typing the same names again, in any casing, lands on the same entries.
    const second = await createClient(context, {
      branchId,
      ownerEmployeeId,
      legalName: "Second Brewery",
      industry: "beverages",
      clientType: "RETAINER",
    });
    const again = await getClient(context, { id: second.client.id });
    expect(again.industry.id).toBe(retrieved.industry.id);
    expect(again.clientType.id).toBe(retrieved.clientType.id);
  });

  it("serves editable CRM classifications instead of hard-coded options", async () => {
    const industry = await createIndustry(context, { name: "Banking" });
    await updateIndustry(context, { id: industry.id, name: "Financial services" });
    const lead = await createPipelineStage(context, {
      name: "Lead",
      position: 1,
      outcome: "open",
    });

    expect(await listPipelineStages(context)).toEqual([
      expect.objectContaining({ id: lead.id, name: "Lead", position: 1 }),
    ]);
    await expect(createIndustry(context, { name: "Financial services" })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("enriches, reassigns, and archives a client without losing owner history", async () => {
    const industry = await createIndustry(context, { name: "Banking" });
    const clientType = await createClientType(context, { name: "Enterprise" });
    const replacementOwner = await createEmployee(context, {
      person: { firstName: "Nahom", lastName: "Desta" },
      employee: {
        branchId,
        employeeCode: "EMP-002",
        employmentType: "permanent",
        hireDate: "2026-01-01",
      },
    });
    const created = await createClient(context, {
      branchId,
      ownerEmployeeId,
      legalName: "Commercial Bank of Ethiopia",
      industryId: industry.id,
      clientTypeId: clientType.id,
    });

    const updated = await updateClient(context, {
      id: created.client.id,
      tradingName: "Commercial",
      tin: "001000002",
      priority: "critical",
      ownerEmployeeId: replacementOwner.employee.id,
    });

    expect(updated).toMatchObject({
      client: {
        tradingName: "Commercial",
        ownerEmployeeId: replacementOwner.employee.id,
        priority: "critical",
      },
      owner: { person: { firstName: "Nahom" } },
    });
    const assignments = await listClientOwnerAssignments(context, { id: created.client.id });
    expect(assignments).toHaveLength(2);
    expect(assignments[0]?.assignment.effectiveTo).not.toBeNull();
    expect(assignments[1]?.assignment).toMatchObject({
      ownerEmployeeId: replacementOwner.employee.id,
      effectiveTo: null,
    });

    const archived = await archiveClient(context, { id: created.client.id });
    expect(archived).toMatchObject({ status: "archived" });
    expect(archived.archivedAt).toBeInstanceOf(Date);
  });

  it("maintains one reachable primary contact for a client", async () => {
    const industry = await createIndustry(context, { name: "Banking" });
    const clientType = await createClientType(context, { name: "Enterprise" });
    const created = await createClient(context, {
      branchId,
      ownerEmployeeId,
      legalName: "Commercial Bank of Ethiopia",
      industryId: industry.id,
      clientTypeId: clientType.id,
    });
    const primary = await createClientContact(context, {
      clientId: created.client.id,
      firstName: "Getachew",
      lastName: "Bekele",
      role: "Primary contact",
      phone: "+251911234002",
      isPrimary: true,
    });
    const finance = await createClientContact(context, {
      clientId: created.client.id,
      firstName: "Rediet",
      lastName: "Assefa",
      role: "Accounts payable",
      email: "finance@cbe.com.et",
    });

    await updateClientContact(context, { id: finance.id, isPrimary: true });
    const contacts = await listClientContacts(context, { clientId: created.client.id });
    expect(contacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: primary.id, isPrimary: false }),
        expect.objectContaining({ id: finance.id, isPrimary: true }),
      ]),
    );

    await archiveClientContact(context, { id: finance.id });
    expect(await listClientContacts(context, { clientId: created.client.id })).toEqual([
      expect.objectContaining({ id: primary.id, status: "active", isPrimary: false }),
    ]);
    await expect(
      createClientContact(context, {
        clientId: created.client.id,
        firstName: "No",
        lastName: "Channel",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("moves one opportunity through editable stages and converts it without replacing it", async () => {
    const industry = await createIndustry(context, { name: "Technology" });
    const clientType = await createClientType(context, { name: "Enterprise" });
    const lead = await createPipelineStage(context, { name: "Lead", position: 1, outcome: "open" });
    const qualified = await createPipelineStage(context, {
      name: "Qualified",
      position: 2,
      outcome: "open",
    });
    const won = await createPipelineStage(context, { name: "Won", position: 3, outcome: "won" });
    const opportunity = await createOpportunity(context, {
      branchId,
      name: "Ride Technologies",
      industryId: industry.id,
      ownerEmployeeId,
      pipelineStageId: lead.id,
      estimatedValue: "320000.00",
      currency: "ETB",
      priority: "medium",
    });

    const moved = await transitionOpportunityStage(context, {
      id: opportunity.opportunity.id,
      toPipelineStageId: qualified.id,
      note: "Discovery completed",
    });
    expect(moved).toMatchObject({
      opportunity: { id: opportunity.opportunity.id, pipelineStageId: qualified.id },
      pipelineStage: { name: "Qualified" },
    });

    const client = await createClient(context, {
      branchId,
      ownerEmployeeId,
      legalName: "Ride Technologies",
      industryId: industry.id,
      clientTypeId: clientType.id,
    });
    const converted = await convertOpportunity(context, {
      id: opportunity.opportunity.id,
      clientId: client.client.id,
      toPipelineStageId: won.id,
    });
    expect(converted.opportunity).toMatchObject({
      id: opportunity.opportunity.id,
      clientId: client.client.id,
      pipelineStageId: won.id,
    });
    expect(converted.opportunity.convertedAt).toBeInstanceOf(Date);

    const transitions = await listOpportunityStageTransitions(context, {
      opportunityId: opportunity.opportunity.id,
    });
    expect(transitions.map((item) => item.toPipelineStage.id)).toEqual([
      lead.id,
      qualified.id,
      won.id,
    ]);
  });

  it("tracks project delivery progress and requires complete projects to reach 100 percent", async () => {
    const industry = await createIndustry(context, { name: "Banking" });
    const clientType = await createClientType(context, { name: "Enterprise" });
    const client = await createClient(context, {
      branchId,
      ownerEmployeeId,
      legalName: "Commercial Bank of Ethiopia",
      industryId: industry.id,
      clientTypeId: clientType.id,
    });
    const project = await createProject(context, {
      clientId: client.client.id,
      branchId,
      name: "Core platform rollout",
      managerEmployeeId: ownerEmployeeId,
      startsOn: "2026-07-01",
      dueOn: "2026-12-30",
    });
    const active = await updateProject(context, {
      id: project.project.id,
      status: "in_progress",
    });
    expect(active.project).toMatchObject({ status: "in_progress" });
    await expect(
      updateProject(context, { id: project.project.id, status: "completed" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    const completed = await updateProject(context, {
      id: project.project.id,
      status: "completed",
      completedOn: "2026-12-20",
    });
    expect(completed.project).toMatchObject({
      status: "completed",
      completedOn: "2026-12-20",
    });
    expect(await listProjects(context, { clientId: client.client.id })).toHaveLength(1);
  });

  it("archives a project out of the active list and only deletes from the archive", async () => {
    const industry = await createIndustry(context, { name: "Banking" });
    const clientType = await createClientType(context, { name: "Enterprise" });
    const client = await createClient(context, {
      branchId,
      ownerEmployeeId,
      legalName: "Commercial Bank of Ethiopia",
      industryId: industry.id,
      clientTypeId: clientType.id,
    });
    const project = await createProject(context, {
      clientId: client.client.id,
      branchId,
      name: "Core platform rollout",
      managerEmployeeId: ownerEmployeeId,
      dueOn: "2026-12-30",
    });

    // A live project refuses hard deletion outright.
    await expect(deleteProject(context, { id: project.project.id })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });

    const archived = await archiveProject(context, { id: project.project.id });
    expect(archived.project.archivedAt).toBeInstanceOf(Date);
    expect(await listProjects(context, { clientId: client.client.id })).toEqual([]);
    expect(
      await listProjects(context, { clientId: client.client.id, includeArchived: true }),
    ).toHaveLength(1);
    await expect(
      updateProject(context, { id: project.project.id, name: "Renamed" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    const restored = await restoreProject(context, { id: project.project.id });
    expect(restored.project.archivedAt).toBeNull();
    expect(await listProjects(context, { clientId: client.client.id })).toHaveLength(1);

    await archiveProject(context, { id: project.project.id });
    await deleteProject(context, { id: project.project.id });
    expect(
      await listProjects(context, { clientId: client.client.id, includeArchived: true }),
    ).toEqual([]);
  });

  it("refuses to delete an archived project that still carries invoices", async () => {
    const industry = await createIndustry(context, { name: "Banking" });
    const clientType = await createClientType(context, { name: "Enterprise" });
    const client = await createClient(context, {
      branchId,
      ownerEmployeeId,
      legalName: "Commercial Bank of Ethiopia",
      industryId: industry.id,
      clientTypeId: clientType.id,
    });
    const project = await createProject(context, {
      clientId: client.client.id,
      branchId,
      name: "Core platform rollout",
      managerEmployeeId: ownerEmployeeId,
      dueOn: "2026-12-30",
    });
    await createInvoice(context, {
      clientId: client.client.id,
      projectId: project.project.id,
      branchId,
      currency: "ETB",
      totalAmount: "6050.00",
    });

    await archiveProject(context, { id: project.project.id });
    await expect(deleteProject(context, { id: project.project.id })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    // The project survives, archived, invoices intact.
    expect(
      await listProjects(context, { clientId: client.client.id, includeArchived: true }),
    ).toHaveLength(1);
  });

  it("keeps Commercial Contracts separate and requires a signature before activation", async () => {
    const industry = await createIndustry(context, { name: "Banking" });
    const clientType = await createClientType(context, { name: "Enterprise" });
    const lead = await createPipelineStage(context, { name: "Lead", position: 1, outcome: "open" });
    const client = await createClient(context, {
      branchId,
      ownerEmployeeId,
      legalName: "Commercial Bank of Ethiopia",
      industryId: industry.id,
      clientTypeId: clientType.id,
    });
    const opportunity = await createOpportunity(context, {
      branchId,
      clientId: client.client.id,
      name: "Managed service",
      industryId: industry.id,
      ownerEmployeeId,
      pipelineStageId: lead.id,
    });
    const contract = await createCommercialContract(context, {
      clientId: client.client.id,
      opportunityId: opportunity.opportunity.id,
      serviceName: "Managed service",
      billingCadence: "annual",
      startsOn: "2026-08-01",
      endsOn: "2027-07-31",
      renewalMode: "automatic",
      amount: "1740000.00",
      currency: "ETB",
    });
    expect(contract.commercialContract.contractCode).toMatch(/^CTR-2026-000001$/);
    await expect(
      updateCommercialContract(context, { id: contract.commercialContract.id, status: "active" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    const active = await updateCommercialContract(context, {
      id: contract.commercialContract.id,
      status: "active",
      signedOn: "2026-07-31",
    });
    expect(active.commercialContract).toMatchObject({
      status: "active",
      signedOn: "2026-07-31",
    });
    expect(await listCommercialContracts(context, { clientId: client.client.id })).toHaveLength(1);
  });

  it("numbers invoices the way the paper does and keeps the printed line detail", async () => {
    const industry = await createIndustry(context, { name: "Banking" });
    const clientType = await createClientType(context, { name: "Enterprise" });
    const client = await createClient(context, {
      branchId,
      ownerEmployeeId,
      legalName: "Commercial Bank of Ethiopia",
      industryId: industry.id,
      clientTypeId: clientType.id,
    });
    // A legacy number from the old scheme must not disturb the new sequence.
    const [organization] = await db.select().from(organizations).limit(1);
    await db.insert(invoices).values({
      organizationId: organization!.id,
      clientId: client.client.id,
      branchId,
      invoiceNumber: "INV-2026-000001",
      currency: "ETB",
      totalAmount: "1000.00",
    });

    const first = await createInvoice(context, {
      clientId: client.client.id,
      branchId,
      currency: "ETB",
      totalAmount: "6050.00",
      description: "Website maintenance",
      note: "May retainer",
    });
    const second = await createInvoice(context, {
      clientId: client.client.id,
      branchId,
      currency: "ETB",
      totalAmount: "1200.00",
    });
    expect(first.invoice.invoiceNumber).toMatch(/^ABY-INV-\d{4}-1$/);
    expect(second.invoice.invoiceNumber).toMatch(/^ABY-INV-\d{4}-2$/);
    expect(first.invoice.description).toBe("Website maintenance");
    expect(first.invoice.note).toBe("May retainer");

    const updated = await updateInvoice(context, {
      id: second.invoice.id,
      description: "Consulting hours",
      note: null,
    });
    expect(updated.invoice.description).toBe("Consulting hours");
    expect(updated.invoice.note).toBeNull();

    const branded = await updateOrganization(context, {
      id: organization!.id,
      tin: "0105805820",
      address: "Addis Ababa Ethiopia, Lemi Kura Sub City",
    });
    expect(branded).toMatchObject({
      tin: "0105805820",
      address: "Addis Ababa Ethiopia, Lemi Kura Sub City",
    });
  });

  it("derives sent, overdue, paid, and outstanding values from invoices and append-only payments", async () => {
    const industry = await createIndustry(context, { name: "Banking" });
    const clientType = await createClientType(context, { name: "Enterprise" });
    const client = await createClient(context, {
      branchId,
      ownerEmployeeId,
      legalName: "Commercial Bank of Ethiopia",
      industryId: industry.id,
      clientTypeId: clientType.id,
    });
    const invoice = await createInvoice(context, {
      clientId: client.client.id,
      branchId,
      currency: "ETB",
      totalAmount: "420000.00",
    });
    expect(invoice.invoice.invoiceNumber).toMatch(/^ABY-INV-\d{4}-1$/);
    expect(invoice.paymentSummary.presentationStatus).toBe("draft");

    const issued = await issueInvoice(context, {
      id: invoice.invoice.id,
      issuedOn: "2026-07-20",
      dueOn: "2026-08-15",
    });
    expect(issued.paymentSummary).toMatchObject({
      paidAmount: "0.00",
      outstandingAmount: "420000.00",
      presentationStatus: "sent",
    });
    await recordInvoicePayment(context, {
      invoiceId: invoice.invoice.id,
      amount: "120000.00",
      currency: "ETB",
      paidOn: "2026-07-25",
      recordedByEmployeeId: ownerEmployeeId,
    });
    const partial = (await listInvoices(context, { asOf: "2026-08-16" })).find(
      (item) => item.invoice.id === invoice.invoice.id,
    );
    expect(partial?.paymentSummary).toMatchObject({
      paidAmount: "120000.00",
      outstandingAmount: "300000.00",
      presentationStatus: "overdue",
    });

    await recordInvoicePayment(context, {
      invoiceId: invoice.invoice.id,
      amount: "300000.00",
      currency: "ETB",
      paidOn: "2026-08-17",
      recordedByEmployeeId: ownerEmployeeId,
    });
    const paid = (await listInvoices(context, { asOf: "2026-08-17" })).find(
      (item) => item.invoice.id === invoice.invoice.id,
    );
    expect(paid?.paymentSummary).toMatchObject({
      paidAmount: "420000.00",
      outstandingAmount: "0.00",
      presentationStatus: "paid",
    });
  });

  it("records authored Notes and CRM Activities without confusing them with system history", async () => {
    const industry = await createIndustry(context, { name: "Banking" });
    const clientType = await createClientType(context, { name: "Enterprise" });
    const lead = await createPipelineStage(context, { name: "Lead", position: 1, outcome: "open" });
    const client = await createClient(context, {
      branchId,
      ownerEmployeeId,
      legalName: "Commercial Bank of Ethiopia",
      industryId: industry.id,
      clientTypeId: clientType.id,
    });
    const contact = await createClientContact(context, {
      clientId: client.client.id,
      firstName: "Getachew",
      lastName: "Bekele",
      phone: "+251911234002",
      isPrimary: true,
    });
    await createOpportunity(context, {
      branchId,
      clientId: client.client.id,
      name: "Managed service renewal",
      ownerEmployeeId,
      pipelineStageId: lead.id,
    });
    const note = await createClientNote(context, {
      clientId: client.client.id,
      authorEmployeeId: ownerEmployeeId,
      body: "Renewal decision expected before end of Ginbot.",
      isPinned: true,
    });
    await updateClientNote(context, { id: note.id, body: "Renewal decision expected in Ginbot." });
    expect(await listClientNotes(context, { clientId: client.client.id })).toEqual([
      expect.objectContaining({
        note: expect.objectContaining({
          id: note.id,
          isPinned: true,
          body: "Renewal decision expected in Ginbot.",
        }),
      }),
    ]);

    const activity = await createCrmActivity(context, {
      clientId: client.client.id,
      clientContactId: contact.id,
      actorEmployeeId: ownerEmployeeId,
      note: "Quarterly business review - Discussed renewal terms",
      contactDate: new Date("2026-07-30T09:00:00.000Z"),
    });
    expect(await listCrmActivities(context, { clientId: client.client.id })).toEqual([
      expect.objectContaining({ activity: expect.objectContaining({ id: activity.activity.id }) }),
    ]);

    await archiveClientNote(context, { id: note.id });
    expect(await listClientNotes(context, { clientId: client.client.id })).toEqual([]);
  });

  it("stores private immutable Client Document versions with one business context", async () => {
    const industry = await createIndustry(context, { name: "Banking" });
    const clientType = await createClientType(context, { name: "Enterprise" });
    const client = await createClient(context, {
      branchId,
      ownerEmployeeId,
      legalName: "Commercial Bank of Ethiopia",
      industryId: industry.id,
      clientTypeId: clientType.id,
    });
    const first = await createClientDocument(context, {
      clientId: client.client.id,
      kind: "registration",
      fileName: "business-license.pdf",
      contentType: "application/pdf",
      contentLength: 340_000,
      accessLevel: "restricted",
      uploadedByEmployeeId: ownerEmployeeId,
    });
    const second = await createClientDocumentVersion(context, {
      logicalDocumentId: first.document.logicalDocumentId,
      fileName: "business-license-renewed.pdf",
      contentType: "application/pdf",
      contentLength: 360_000,
      uploadedByEmployeeId: ownerEmployeeId,
    });

    expect(second.document).toMatchObject({
      logicalDocumentId: first.document.logicalDocumentId,
      version: 2,
      accessLevel: "restricted",
    });
    expect(second.document.storageKey).not.toBe(first.document.storageKey);
    expect(second.document.storageKey).not.toMatch(/^https?:/);
    const documents = await listClientDocuments(context, { clientId: client.client.id });
    expect(documents.map((item) => item.document.version)).toEqual([2, 1]);
  });

  it("assembles Client Profile, Health, Timeline, and Audit Log from authoritative records", async () => {
    const industry = await createIndustry(context, { name: "Banking" });
    const clientType = await createClientType(context, { name: "Enterprise" });
    const client = await createClient(context, {
      branchId,
      ownerEmployeeId,
      legalName: "Commercial Bank of Ethiopia",
      industryId: industry.id,
      clientTypeId: clientType.id,
      relationshipStartedOn: "2026-01-01",
    });
    const contact = await createClientContact(context, {
      clientId: client.client.id,
      firstName: "Getachew",
      lastName: "Bekele",
      phone: "+251911234002",
      isPrimary: true,
    });
    const project = await createProject(context, {
      clientId: client.client.id,
      branchId,
      name: "Core platform rollout",
      managerEmployeeId: ownerEmployeeId,
      status: "in_progress",
      startsOn: "2026-07-01",
      dueOn: "2026-12-30",
    });
    await createCrmActivity(context, {
      clientId: client.client.id,
      actorEmployeeId: ownerEmployeeId,
      note: "Quarterly business review",
      contactDate: new Date("2026-07-30T09:00:00.000Z"),
    });

    const profile = await getClientProfile(context, {
      id: client.client.id,
      asOf: "2026-07-31",
    });
    expect(profile.primaryContact).toMatchObject({ id: contact.id, isPrimary: true });
    expect(profile.currentProjects).toEqual([
      expect.objectContaining({ project: expect.objectContaining({ id: project.project.id }) }),
    ]);
    expect(profile.health).toMatchObject({ band: "healthy", score: 100 });

    const timeline = await getClientTimeline(context, {
      id: client.client.id,
      asOf: "2026-07-31",
    });
    expect(timeline.map((item) => item.kind)).toEqual(
      expect.arrayContaining(["client_created", "account_owner_assigned", "crm_activity"]),
    );
    const audit = await listClientAuditEntries(context, { id: client.client.id });
    expect(audit.map((item) => item.entry.action)).toEqual(
      expect.arrayContaining(["client.created", "project.created", "crm_activity.created"]),
    );
  });

  it("returns a Client directory row with explicit derived commercial measures", async () => {
    const industry = await createIndustry(context, { name: "Banking" });
    const clientType = await createClientType(context, { name: "Enterprise" });
    const client = await createClient(context, {
      branchId,
      ownerEmployeeId,
      legalName: "Commercial Bank of Ethiopia",
      industryId: industry.id,
      clientTypeId: clientType.id,
    });
    await createProject(context, {
      clientId: client.client.id,
      branchId,
      name: "Core platform rollout",
      managerEmployeeId: ownerEmployeeId,
      status: "in_progress",
      dueOn: "2026-12-30",
    });
    const invoice = await createInvoice(context, {
      clientId: client.client.id,
      branchId,
      currency: "ETB",
      totalAmount: "420000.00",
    });
    await issueInvoice(context, {
      id: invoice.invoice.id,
      issuedOn: "2026-07-20",
      dueOn: "2026-08-15",
    });
    await recordInvoicePayment(context, {
      invoiceId: invoice.invoice.id,
      amount: "120000.00",
      currency: "ETB",
      paidOn: "2026-07-25",
      recordedByEmployeeId: ownerEmployeeId,
    });
    await createCrmActivity(context, {
      clientId: client.client.id,
      actorEmployeeId: ownerEmployeeId,
      note: "Discussed renewal",
      contactDate: new Date("2026-07-30T09:00:00.000Z"),
    });

    const directory = await listClients(context, {});
    expect(directory.items[0]).toMatchObject({
      directoryStatus: { kind: "active_project", label: "Active project" },
      invoicedRevenue: { amount: "420000.00", currency: "ETB" },
      collectedRevenue: { amount: "120000.00", currency: "ETB" },
      outstanding: { amount: "300000.00", currency: "ETB" },
      projectCount: 1,
      recurring: false,
      lastActivityAt: new Date("2026-07-30T09:00:00.000Z"),
    });
  });

  it("builds the Client overview from explicit operational and commercial measures", async () => {
    const industry = await createIndustry(context, { name: "Banking" });
    const clientType = await createClientType(context, { name: "Enterprise" });
    const lead = await createPipelineStage(context, {
      name: "Lead",
      position: 1,
      outcome: "open",
    });
    const won = await createPipelineStage(context, {
      name: "Won",
      position: 2,
      outcome: "won",
    });
    const client = await createClient(context, {
      branchId,
      ownerEmployeeId,
      legalName: "Commercial Bank of Ethiopia",
      industryId: industry.id,
      clientTypeId: clientType.id,
    });
    const opportunity = await createOpportunity(context, {
      branchId,
      clientId: client.client.id,
      name: "Managed service",
      ownerEmployeeId,
      pipelineStageId: lead.id,
      estimatedValue: "540000.00",
      currency: "ETB",
    });
    await transitionOpportunityStage(context, {
      id: opportunity.opportunity.id,
      toPipelineStageId: won.id,
      occurredAt: new Date("2026-07-10T09:00:00.000Z"),
    });
    await convertOpportunity(context, {
      id: opportunity.opportunity.id,
      clientId: client.client.id,
      occurredAt: new Date("2026-07-10T09:30:00.000Z"),
    });
    await createProject(context, {
      clientId: client.client.id,
      branchId,
      name: "Core platform rollout",
      managerEmployeeId: ownerEmployeeId,
      status: "in_progress",
      dueOn: "2026-12-30",
    });
    await createProject(context, {
      clientId: client.client.id,
      branchId,
      name: "Discovery",
      managerEmployeeId: ownerEmployeeId,
      status: "completed",
      dueOn: "2026-06-30",
      completedOn: "2026-06-25",
    });
    const invoice = await createInvoice(context, {
      clientId: client.client.id,
      branchId,
      currency: "ETB",
      totalAmount: "420000.00",
    });
    await issueInvoice(context, {
      id: invoice.invoice.id,
      issuedOn: "2026-07-20",
      dueOn: "2026-08-15",
    });
    await recordInvoicePayment(context, {
      invoiceId: invoice.invoice.id,
      amount: "120000.00",
      currency: "ETB",
      paidOn: "2026-07-25",
      recordedByEmployeeId: ownerEmployeeId,
    });

    const overview = await getClientOverview(context, {
      asOf: "2026-08-16",
      from: "2026-07-01",
      to: "2026-08-31",
    });

    expect(overview.summary).toMatchObject({
      activeClientCount: 1,
      activeProjectCount: 1,
      recurringClientCount: 1,
      invoicedRevenue: { amount: "420000.00", currency: "ETB" },
      collectedRevenue: { amount: "120000.00", currency: "ETB" },
      outstanding: { amount: "300000.00", currency: "ETB" },
      overdue: {
        amount: "300000.00",
        currency: "ETB",
        invoiceCount: 1,
      },
      averageOpportunityValue: { amount: "540000.00", currency: "ETB" },
      opportunityConversion: { total: 1, converted: 1, ratePercent: 100 },
    });
    expect(overview.byMonth).toEqual([
      expect.objectContaining({
        period: "2026-07",
        invoiced: expect.objectContaining({ amount: "420000.00", currency: "ETB" }),
        collected: expect.objectContaining({ amount: "120000.00", currency: "ETB" }),
      }),
    ]);
    expect(overview.byIndustry[0]).toMatchObject({
      industry: { id: industry.id, name: "Banking" },
      invoiced: { amount: "420000.00", currency: "ETB" },
    });
    expect(overview.byClient[0]).toMatchObject({
      client: {
        id: client.client.id,
        legalName: "Commercial Bank of Ethiopia",
      },
      invoiced: { amount: "420000.00", currency: "ETB" },
    });
    expect(overview.byBranch[0]).toMatchObject({
      branch: { id: branchId, name: "Addis HQ" },
      invoiced: { amount: "420000.00", currency: "ETB" },
    });
  });

  it("edits authored sales records while preserving lifecycle and financial history", async () => {
    const industry = await createIndustry(context, { name: "Technology" });
    const clientType = await createClientType(context, { name: "Enterprise" });
    const lead = await createPipelineStage(context, {
      name: "Lead",
      position: 1,
      outcome: "open",
    });
    const client = await createClient(context, {
      branchId,
      ownerEmployeeId,
      legalName: "Ride Technologies",
      industryId: industry.id,
      clientTypeId: clientType.id,
    });
    const opportunity = await createOpportunity(context, {
      branchId,
      clientId: client.client.id,
      name: "Initial scope",
      ownerEmployeeId,
      pipelineStageId: lead.id,
    });
    const updatedOpportunity = await updateOpportunity(context, {
      id: opportunity.opportunity.id,
      name: "Managed service scope",
      estimatedValue: "320000.00",
      currency: "ETB",
      priority: "high",
    });
    expect(updatedOpportunity.opportunity).toMatchObject({
      name: "Managed service scope",
      estimatedValue: "320000.00",
      currency: "ETB",
      priority: "high",
    });

    const activity = await createCrmActivity(context, {
      clientId: client.client.id,
      actorEmployeeId: ownerEmployeeId,
      note: "Discovery call",
      contactDate: new Date("2026-07-30T09:00:00.000Z"),
    });
    const updatedActivity = await updateCrmActivity(context, {
      id: activity.activity.id,
      note: "Discovery meeting - Scope confirmed",
    });
    expect(updatedActivity.activity).toMatchObject({
      note: "Discovery meeting - Scope confirmed",
    });
    await deleteCrmActivity(context, { id: activity.activity.id });
    expect(await listCrmActivities(context, { clientId: client.client.id })).toEqual([]);

    const invoice = await createInvoice(context, {
      clientId: client.client.id,
      branchId,
      currency: "ETB",
      totalAmount: "320000.00",
    });
    const updatedInvoice = await updateInvoice(context, {
      id: invoice.invoice.id,
      totalAmount: "340000.00",
    });
    expect(updatedInvoice.invoice.totalAmount).toBe("340000.00");
    await expect(voidInvoice(context, { id: invoice.invoice.id })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    await issueInvoice(context, {
      id: invoice.invoice.id,
      issuedOn: "2026-07-31",
      dueOn: "2026-08-31",
    });
    const voided = await voidInvoice(context, { id: invoice.invoice.id });
    expect(voided).toMatchObject({
      invoice: { lifecycleStatus: "void" },
      paymentSummary: { presentationStatus: "void" },
    });
  });
});
