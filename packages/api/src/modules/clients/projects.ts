import { and, asc, eq } from "drizzle-orm";

import {
  branches,
  clientAuditEntries,
  clients,
  commercialContracts,
  employees,
  people,
  projects,
} from "@UnifiedAttendance/db/schema/index";

import { badRequest, notFound } from "../../errors";
import { withTransaction } from "../../context";
import { requirePermission, requireSessionUser } from "../shared/guards";
import { clientOrThrow, currentOrganizationOrThrow } from "./shared";

import type { Context } from "../../context";
import type {
  ClientResourceIdInput,
  CreateProjectInput,
  ListProjectsInput,
  UpdateProjectInput,
} from "../../validations/clients";

const projectSelection = {
  project: projects,
  client: clients,
  branch: branches,
  commercialContract: commercialContracts,
  managerEmployee: employees,
  managerPerson: people,
};

function projectQuery(ctx: Context) {
  return ctx.db
    .select(projectSelection)
    .from(projects)
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .innerJoin(branches, eq(projects.branchId, branches.id))
    .leftJoin(commercialContracts, eq(projects.commercialContractId, commercialContracts.id))
    .innerJoin(employees, eq(projects.managerEmployeeId, employees.id))
    .innerJoin(people, eq(employees.personId, people.id));
}

function shapeProject(row: Awaited<ReturnType<typeof projectQuery>>[number]) {
  const { managerEmployee, managerPerson, ...rest } = row;
  return { ...rest, manager: { employee: managerEmployee, person: managerPerson } };
}

async function projectOrThrow(ctx: Context, projectId: string) {
  const [project] = await ctx.db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) notFound("Project");
  return project;
}

async function validateProjectReferences(
  ctx: Context,
  input: {
    organizationId: string;
    clientId: string;
    branchId: string;
    managerEmployeeId: string;
    commercialContractId?: string | null;
  },
) {
  const client = await clientOrThrow(ctx, input.clientId);
  if (client.organizationId !== input.organizationId)
    badRequest("Client belongs to another Organization");
  const [[branch], [manager]] = await Promise.all([
    ctx.db
      .select({ id: branches.id })
      .from(branches)
      .where(eq(branches.id, input.branchId))
      .limit(1),
    ctx.db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.id, input.managerEmployeeId))
      .limit(1),
  ]);
  if (!branch) badRequest("Branch is not available");
  if (!manager) badRequest("Project Manager is not available");
  if (input.commercialContractId) {
    const [contract] = await ctx.db
      .select({ id: commercialContracts.id })
      .from(commercialContracts)
      .where(
        and(
          eq(commercialContracts.id, input.commercialContractId),
          eq(commercialContracts.organizationId, input.organizationId),
          eq(commercialContracts.clientId, input.clientId),
        ),
      )
      .limit(1);
    if (!contract) badRequest("Commercial Contract does not belong to this Client");
  }
  return client;
}

function validateProjectState(input: {
  status: "planning" | "in_progress" | "completed" | "cancelled";
  progressPercent: number;
  startsOn: string | null;
  dueOn: string;
  completedOn: string | null;
}) {
  if (input.startsOn && input.dueOn < input.startsOn) {
    badRequest("Project due date cannot be before its start date");
  }
  if (input.status === "completed") {
    if (input.progressPercent !== 100 || !input.completedOn) {
      badRequest("A completed Project requires 100 percent progress and a completion date");
    }
  } else if (input.completedOn) {
    badRequest("Only a completed Project may have a completion date");
  }
}

export async function getProject(ctx: Context, input: ClientResourceIdInput) {
  const project = await projectOrThrow(ctx, input.id);
  await requirePermission(ctx, "clients:read", project.branchId);
  const [row] = await projectQuery(ctx).where(eq(projects.id, input.id)).limit(1);
  if (!row) throw new Error("Project details could not be loaded");
  return shapeProject(row);
}

export async function listProjects(ctx: Context, input: ListProjectsInput) {
  await requirePermission(ctx, "clients:read", input.branchId);
  const organization = await currentOrganizationOrThrow(ctx);
  const filters = [eq(projects.organizationId, organization.id)];
  if (input.clientId) filters.push(eq(projects.clientId, input.clientId));
  if (input.branchId) filters.push(eq(projects.branchId, input.branchId));
  if (input.status) filters.push(eq(projects.status, input.status));
  const rows = await projectQuery(ctx)
    .where(and(...filters))
    .orderBy(asc(projects.dueOn), asc(projects.name));
  return rows.map(shapeProject);
}

export async function createProject(ctx: Context, input: CreateProjectInput) {
  await requirePermission(ctx, "clients:manage", input.branchId);
  const organization = await currentOrganizationOrThrow(ctx);
  const client = await validateProjectReferences(ctx, {
    organizationId: organization.id,
    ...input,
  });
  const status = input.status ?? "planning";
  const progressPercent = input.progressPercent ?? 0;
  const startsOn = input.startsOn ?? null;
  const completedOn = input.completedOn ?? null;
  validateProjectState({ status, progressPercent, startsOn, dueOn: input.dueOn, completedOn });
  const actorUserId = requireSessionUser(ctx);
  const [created] = await withTransaction(ctx, async (ctx) => {
    const result = await ctx.db
      .insert(projects)
      .values({
        organizationId: organization.id,
        ...input,
        commercialContractId: input.commercialContractId ?? null,
        status,
        progressPercent,
        startsOn,
        completedOn,
      })
      .returning({ id: projects.id });
    const project = result[0];
    if (!project) throw new Error("Project creation failed");
    await ctx.db.insert(clientAuditEntries).values({
      organizationId: organization.id,
      clientId: client.id,
      actorUserId,
      action: "project.created",
      entityType: "project",
      entityId: project.id,
    });
    return result;
  });
  return getProject(ctx, { id: created!.id });
}

export async function updateProject(ctx: Context, input: UpdateProjectInput) {
  const current = await projectOrThrow(ctx, input.id);
  await requirePermission(ctx, "clients:manage", current.branchId);
  const organization = await currentOrganizationOrThrow(ctx);
  const clientId = current.clientId;
  const branchId = input.branchId ?? current.branchId;
  if (branchId !== current.branchId) await requirePermission(ctx, "clients:manage", branchId);
  const status = input.status ?? current.status;
  const progressPercent = input.progressPercent ?? current.progressPercent;
  const startsOn = input.startsOn === undefined ? current.startsOn : input.startsOn;
  const dueOn = input.dueOn ?? current.dueOn;
  const completedOn =
    input.completedOn === undefined
      ? status === "completed"
        ? current.completedOn
        : null
      : input.completedOn;
  const commercialContractId =
    input.commercialContractId === undefined
      ? current.commercialContractId
      : input.commercialContractId;
  await validateProjectReferences(ctx, {
    organizationId: organization.id,
    clientId,
    branchId,
    managerEmployeeId: input.managerEmployeeId ?? current.managerEmployeeId,
    commercialContractId,
  });
  validateProjectState({ status, progressPercent, startsOn, dueOn, completedOn });
  const actorUserId = requireSessionUser(ctx);
  const { id: projectId, ...values } = input;
  await withTransaction(ctx, async (ctx) => {
    await ctx.db
      .update(projects)
      .set({ ...values, status, progressPercent, startsOn, dueOn, completedOn })
      .where(eq(projects.id, projectId));
    await ctx.db.insert(clientAuditEntries).values({
      organizationId: organization.id,
      clientId,
      actorUserId,
      action: "project.updated",
      entityType: "project",
      entityId: projectId,
      changeSummary: { changedFields: Object.keys(values) },
    });
  });
  return getProject(ctx, { id: projectId });
}
