import { fileURLToPath } from "node:url";

import { and, eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import {
  branches,
  clientContacts,
  clientNotes,
  clientOwnerAssignments,
  clientTypes,
  clients,
  commercialContracts,
  crmActivities,
  employees,
  industries,
  invoicePayments,
  invoices,
  opportunities,
  organizations,
  pipelineStages,
  projects,
  user,
} from "@UnifiedAttendance/db/schema/index";

const INDUSTRIES = ["Banking", "Telecom", "Construction", "Hospitality", "Education", "Health"];
const CLIENT_TYPES = ["Enterprise", "SME", "Government", "NGO"];
const PIPELINE_STAGES = [
  { name: "Lead", position: 1, outcome: "open" },
  { name: "Qualified", position: 2, outcome: "open" },
  { name: "Proposal sent", position: 3, outcome: "open" },
  { name: "Negotiation", position: 4, outcome: "open" },
  { name: "Waiting payment", position: 5, outcome: "open" },
  { name: "Won", position: 6, outcome: "won" },
  { name: "Lost", position: 7, outcome: "lost" },
] as const;

const CONTRACTS = [
  {
    code: "CTR-2026-041",
    serviceName: "Managed service",
    billingCadence: "annual",
    startsOn: "2024-09-11",
    endsOn: "2026-09-05",
    renewalMode: "automatic" as const,
    status: "active" as const,
    amount: "1740000.00",
  },
  {
    code: "CTR-2026-038",
    serviceName: "Software licence",
    billingCadence: "multi-year",
    startsOn: "2024-01-19",
    endsOn: "2026-01-18",
    renewalMode: "automatic" as const,
    status: "active" as const,
    amount: "2400000.00",
  },
  {
    code: "CTR-2026-052",
    serviceName: "Support retainer",
    billingCadence: "monthly",
    startsOn: "2024-12-10",
    endsOn: "2026-08-20",
    renewalMode: "manual" as const,
    status: "active" as const,
    amount: "960000.00",
  },
  {
    code: "CTR-2026-063",
    serviceName: "Pilot agreement",
    billingCadence: "one-off",
    startsOn: "2025-02-09",
    endsOn: "2026-05-17",
    renewalMode: "manual" as const,
    status: "draft" as const,
    amount: "420000.00",
  },
] as const;

const INVOICES = [
  { suffix: "A", amount: "420000.00", issuedOn: null, dueOn: null, paid: null },
  {
    suffix: "B",
    amount: "1740000.00",
    issuedOn: "2026-01-19",
    dueOn: "2026-02-03",
    paid: { amount: "1740000.00", paidOn: "2026-01-28", method: "Telebirr" },
  },
  {
    suffix: "C",
    amount: "1044000.00",
    issuedOn: "2026-03-10",
    dueOn: "2026-03-25",
    paid: { amount: "400000.00", paidOn: "2026-03-18", method: "Bank transfer" },
  },
] as const;

const CLIENTS = [
  {
    code: "CLI-2026-000001",
    legalName: "Ethio Telecom",
    tradingName: null,
    industry: "Telecom",
    clientType: "Enterprise",
    tin: "0001000001",
    vat: "ET000001",
    registration: "MT/AA/0001",
    licence: "TRD-00001",
    website: "https://www.ethiotelecom.et",
    phone: "+251 911 234 001",
    email: "procurement@ethiotelecom.et",
    startedOn: "2024-06-11",
    priority: "high" as const,
  },
  {
    code: "CLI-2026-000002",
    legalName: "Commercial Bank of Ethiopia",
    tradingName: "Commercial",
    industry: "Banking",
    clientType: "Enterprise",
    tin: "0001000002",
    vat: "ET000002",
    registration: "MT/AA/0002",
    licence: "TRD-00002",
    website: "https://www.cbe.com.et",
    phone: "+251 911 234 002",
    email: "vendors@cbe.com.et",
    startedOn: "2024-09-13",
    priority: "critical" as const,
  },
  {
    code: "CLI-2026-000003",
    legalName: "Sunrise Construction PLC",
    tradingName: null,
    industry: "Construction",
    clientType: "SME",
    tin: "0001000003",
    vat: "ET000003",
    registration: "MT/AA/0003",
    licence: "TRD-00003",
    website: "https://www.sunrise.et",
    phone: "+251 911 234 003",
    email: "info@sunrise.et",
    startedOn: "2025-01-20",
    priority: "normal" as const,
  },
  {
    code: "CLI-2026-000004",
    legalName: "Kuriftu Resort & Spa",
    tradingName: "Kuriftu",
    industry: "Hospitality",
    clientType: "SME",
    tin: "0001000004",
    vat: "ET000004",
    registration: "MT/AA/0004",
    licence: "TRD-00004",
    website: "https://www.kuriftu.com",
    phone: "+251 911 234 004",
    email: "reservations@kuriftu.com",
    startedOn: "2025-03-02",
    priority: "low" as const,
  },
];

async function upsertCatalog(
  table: typeof industries | typeof clientTypes,
  organizationId: string,
  names: string[],
) {
  for (const name of names) {
    await db.insert(table).values({ organizationId, name }).onConflictDoNothing();
  }
  return new Map(
    (
      await db
        .select({ id: table.id, name: table.name })
        .from(table)
        .where(eq(table.organizationId, organizationId))
    ).map((row) => [row.name, row.id]),
  );
}

export async function seedClients() {
  const [organization] = await db.select().from(organizations).limit(1);
  if (!organization) throw new Error("Run the organization setup before seeding clients");

  // Branches are not organization-scoped in this schema; there is one workspace.
  const [branch] = await db.select().from(branches).limit(1);
  if (!branch) throw new Error("The organization has no branch to attach clients to");

  const staff = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.branchId, branch.id));
  if (staff.length === 0) throw new Error("Seed at least one employee before seeding clients");

  /** Owners and managers rotate through whatever staff exist, so any dataset works. */
  const employeeAt = (index: number) => staff[index % staff.length]!.id;

  // Owner assignments must name the user who made them, so the seed borrows
  // the first account in the workspace.
  const [actor] = await db.select({ id: user.id }).from(user).orderBy(user.createdAt).limit(1);
  if (!actor) throw new Error("Create a user (rbac:seed-admin) before seeding clients");
  const actorUserId = actor.id;

  const industryId = await upsertCatalog(industries, organization.id, INDUSTRIES);
  const clientTypeId = await upsertCatalog(clientTypes, organization.id, CLIENT_TYPES);

  for (const stage of PIPELINE_STAGES) {
    await db
      .insert(pipelineStages)
      .values({
        organizationId: organization.id,
        name: stage.name,
        position: stage.position,
        outcome: stage.outcome,
      })
      .onConflictDoNothing();
  }
  const stageId = new Map(
    (
      await db
        .select({ id: pipelineStages.id, name: pipelineStages.name })
        .from(pipelineStages)
        .where(eq(pipelineStages.organizationId, organization.id))
    ).map((row) => [row.name, row.id]),
  );

  const clientId = new Map<string, string>();

  for (const [index, seed] of CLIENTS.entries()) {
    const [existing] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.organizationId, organization.id), eq(clients.clientCode, seed.code)))
      .limit(1);

    let id = existing?.id;

    if (!id) {
      const [created] = await db
        .insert(clients)
        .values({
          organizationId: organization.id,
          branchId: branch.id,
          ownerEmployeeId: employeeAt(index),
          clientCode: seed.code,
          legalName: seed.legalName,
          tradingName: seed.tradingName,
          industryId: industryId.get(seed.industry)!,
          clientTypeId: clientTypeId.get(seed.clientType)!,
          phone: seed.phone,
          relationshipStartedOn: seed.startedOn,
          priority: seed.priority,
        })
        .returning({ id: clients.id });
      id = created!.id;

      await db.insert(clientOwnerAssignments).values({
        organizationId: organization.id,
        clientId: id,
        ownerEmployeeId: employeeAt(index),
        assignedByUserId: actorUserId,
        effectiveFrom: new Date(`${seed.startedOn}T08:00:00Z`),
      });

      await db.insert(clientContacts).values([
        {
          organizationId: organization.id,
          clientId: id,
          firstName: "Getachew",
          lastName: "Bekele",
          role: "Head of procurement",
          phone: seed.phone,
          email: seed.email,
          isPrimary: true,
        },
        {
          organizationId: organization.id,
          clientId: id,
          firstName: "Hanna",
          lastName: "Girma",
          role: "Accounts payable",
          phone: "+251 911 555 010",
          email: `finance@${new URL(seed.website).hostname.replace("www.", "")}`,
          isPrimary: false,
        },
      ]);

      await db.insert(clientNotes).values([
        {
          organizationId: organization.id,
          clientId: id,
          authorEmployeeId: employeeAt(index),
          body: "Key account — renewal decision expected before end of Ginbot. Prefers Telebirr settlement.",
          isPinned: true,
        },
        {
          organizationId: organization.id,
          clientId: id,
          authorEmployeeId: employeeAt(index + 1),
          body: "Legal reviewing updated SOW. Follow up next week on signature.",
          isPinned: false,
        },
      ]);

      await db.insert(crmActivities).values([
        {
          organizationId: organization.id,
          clientId: id,
          actorEmployeeId: employeeAt(index),
          note: "Discussed renewal terms — Positive, pricing accepted in principle.",
          contactDate: new Date("2026-02-28T09:15:00Z"),
        },
        {
          organizationId: organization.id,
          clientId: id,
          actorEmployeeId: employeeAt(index),
          note: "Quarterly business review held at the client head office.",
          contactDate: new Date("2026-02-27T13:00:00Z"),
        },
        {
          organizationId: organization.id,
          clientId: id,
          actorEmployeeId: employeeAt(index + 1),
          note: "Sent updated statement of work",
          contactDate: new Date("2026-02-21T10:30:00Z"),
        },
        {
          organizationId: organization.id,
          clientId: id,
          actorEmployeeId: employeeAt(index),
          note: "On-site scoping — Requirements confirmed.",
          contactDate: new Date("2026-02-09T08:00:00Z"),
        },
      ]);
    }

    clientId.set(seed.code, id);

    const agreement = CONTRACTS[index % CONTRACTS.length]!;
    const [existingContract] = await db
      .select({ id: commercialContracts.id })
      .from(commercialContracts)
      .where(
        and(
          eq(commercialContracts.organizationId, organization.id),
          eq(commercialContracts.contractCode, agreement.code),
        ),
      )
      .limit(1);
    if (existingContract) continue;

    const [contract] = await db
      .insert(commercialContracts)
      .values({
        organizationId: organization.id,
        clientId: id,
        contractCode: agreement.code,
        serviceName: agreement.serviceName,
        billingCadence: agreement.billingCadence,
        startsOn: agreement.startsOn,
        endsOn: agreement.endsOn,
        renewalMode: agreement.renewalMode,
        status: agreement.status,
        // Only a draft may be unsigned; every other state needs an execution date.
        signedOn: agreement.status === "draft" ? null : agreement.startsOn,
        amount: agreement.amount,
        currency: "ETB",
      })
      .returning({ id: commercialContracts.id });

    const [rollout] = await db
      .insert(projects)
      .values([
        {
          organizationId: organization.id,
          clientId: id,
          branchId: branch.id,
          commercialContractId: contract!.id,
          name: "Core platform rollout",
          managerEmployeeId: employeeAt(index),
          status: "in_progress",
          startsOn: seed.startedOn,
          dueOn: "2026-06-07",
        },
        {
          organizationId: organization.id,
          clientId: id,
          branchId: branch.id,
          commercialContractId: contract!.id,
          name: "Branch integration",
          managerEmployeeId: employeeAt(index),
          status: "planning",
          dueOn: "2026-06-22",
        },
      ])
      .returning({ id: projects.id });

    for (const template of INVOICES) {
      const [invoice] = await db
        .insert(invoices)
        .values({
          organizationId: organization.id,
          clientId: id,
          projectId: rollout!.id,
          commercialContractId: contract!.id,
          branchId: branch.id,
          invoiceNumber: `INV-2026-${String(200 + index * 3).padStart(4, "0")}-${template.suffix}`,
          issuedOn: template.issuedOn,
          dueOn: template.dueOn,
          currency: "ETB",
          totalAmount: template.amount,
          lifecycleStatus: template.issuedOn ? "issued" : "draft",
        })
        .returning({ id: invoices.id });

      if (!template.paid) continue;
      await db.insert(invoicePayments).values({
        organizationId: organization.id,
        invoiceId: invoice!.id,
        amount: template.paid.amount,
        currency: "ETB",
        paidOn: template.paid.paidOn,
        method: template.paid.method,
        reference: `TRF-${index}${template.suffix}`,
        recordedByEmployeeId: employeeAt(index + 1),
      });
    }
  }

  // Open prospects across the board, including one not yet converted to a client.
  const openStages = ["Lead", "Qualified", "Proposal sent", "Negotiation", "Waiting payment"];
  for (const [index, stage] of openStages.entries()) {
    const seed = CLIENTS[index % CLIENTS.length]!;
    const name = index === 0 ? "Dakaya Inc. platform rebuild" : `${seed.legalName} expansion`;
    const [existing] = await db
      .select({ id: opportunities.id })
      .from(opportunities)
      .where(and(eq(opportunities.organizationId, organization.id), eq(opportunities.name, name)))
      .limit(1);
    if (existing) continue;

    await db.insert(opportunities).values({
      organizationId: organization.id,
      branchId: branch.id,
      // The first card is a prospect: no client until it converts.
      clientId: index === 0 ? null : (clientId.get(seed.code) ?? null),
      name,
      industryId: industryId.get(seed.industry) ?? null,
      ownerEmployeeId: employeeAt(index),
      pipelineStageId: stageId.get(stage)!,
      estimatedValue: index === 0 ? null : `${(index + 1) * 320000}.00`,
      currency: index === 0 ? null : "ETB",
      priority: (["low", "medium", "high"] as const)[index % 3],
      lastActivityAt: new Date(Date.now() - (index + 1) * 3600 * 1000),
    });
  }

  const [{ value: clientCount } = { value: 0 }] = await db
    .select({ value: clients.id })
    .from(clients)
    .where(eq(clients.organizationId, organization.id))
    .then((rows) => [{ value: rows.length }]);

  console.log(`Seeded Client/CRM demo data. Clients in workspace: ${clientCount}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await seedClients();
}
