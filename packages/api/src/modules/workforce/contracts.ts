import { desc, eq } from "drizzle-orm";

import {
  cosigners,
  departments,
  employmentContracts,
  employmentPeriods,
  employees,
  people,
  positions,
} from "@UnifiedAttendance/db/schema/index";
import { EMPLOYMENT_CONTRACT_STATUSES } from "@UnifiedAttendance/db/schema/workforce-enums";

import { badRequest, conflict, notFound } from "../../errors";
import { withTransaction } from "../../context";
import { requirePermission } from "../shared/guards";
import { employeeOrThrow, employmentAt } from "./shared";

import type {
  CreateEmploymentContractInput,
  ListEmploymentContractsInput,
  ResourceIdInput,
  UpdateEmploymentContractInput,
} from "../../validations/workforce";
import type { Context } from "../../context";

const contractSelection = {
  contract: employmentContracts,
  employee: employees,
  person: people,
  period: employmentPeriods,
  department: departments,
  position: positions,
  cosigner: cosigners,
};

function contractQuery(ctx: Context) {
  return ctx.db
    .select(contractSelection)
    .from(employmentContracts)
    .innerJoin(employees, eq(employmentContracts.employeeId, employees.id))
    .innerJoin(people, eq(employees.personId, people.id))
    .innerJoin(employmentPeriods, eq(employmentContracts.employmentPeriodId, employmentPeriods.id))
    .leftJoin(departments, eq(employmentPeriods.departmentId, departments.id))
    .leftJoin(positions, eq(employmentPeriods.positionId, positions.id))
    .innerJoin(cosigners, eq(employmentContracts.cosignerId, cosigners.id));
}

async function employmentContractOrThrow(ctx: Context, contractId: string) {
  const [contract] = await ctx.db
    .select()
    .from(employmentContracts)
    .where(eq(employmentContracts.id, contractId))
    .limit(1);
  if (!contract) notFound("Employment contract");
  return contract;
}

async function employmentContractDetails(ctx: Context, contractId: string) {
  const [result] = await contractQuery(ctx).where(eq(employmentContracts.id, contractId)).limit(1);
  if (!result) notFound("Employment contract");
  return result;
}

function validateEmploymentContract(values: {
  startsOn: string;
  endsOn: string | null;
  status: (typeof EMPLOYMENT_CONTRACT_STATUSES)[number];
  signedOn: string | null;
}) {
  if (values.endsOn && values.endsOn < values.startsOn) {
    badRequest("The contract end date cannot be before its start date");
  }
  if ((values.status === "signed" || values.status === "ended") && !values.signedOn) {
    badRequest("A signed date is required for signed or ended contracts");
  }
}

async function ensureUniqueContractNumber(
  ctx: Context,
  contractNumber: string,
  currentId?: string,
) {
  const [existing] = await ctx.db
    .select({ id: employmentContracts.id })
    .from(employmentContracts)
    .where(eq(employmentContracts.contractNumber, contractNumber))
    .limit(1);
  if (existing && existing.id !== currentId) conflict("Contract number already exists");
}

export async function listEmploymentContracts(ctx: Context, input: ListEmploymentContractsInput) {
  await requirePermission(ctx, "workforce:read");
  return contractQuery(ctx)
    .where(input.employeeId ? eq(employmentContracts.employeeId, input.employeeId) : undefined)
    .orderBy(desc(employmentContracts.createdAt));
}

export async function createEmploymentContract(ctx: Context, input: CreateEmploymentContractInput) {
  const employee = await employeeOrThrow(ctx, input.employeeId);
  await requirePermission(ctx, "workforce:manage", employee.branchId);
  const period = await employmentAt(ctx, input.employeeId, input.startsOn);
  if (!period) badRequest("No employment period covers the contract start date");
  await ensureUniqueContractNumber(ctx, input.contractNumber);
  validateEmploymentContract({
    startsOn: input.startsOn,
    endsOn: input.endsOn ?? null,
    status: input.status,
    signedOn: input.signedOn ?? null,
  });
  const contractId = await withTransaction(ctx, async (ctx) => {
    const [cosigner] = await ctx.db.insert(cosigners).values(input.cosigner).returning();
    if (!cosigner) throw new Error("Cosigner creation failed");
    const [contract] = await ctx.db
      .insert(employmentContracts)
      .values({
        contractNumber: input.contractNumber,
        employeeId: input.employeeId,
        employmentPeriodId: period.id,
        cosignerId: cosigner.id,
        startsOn: input.startsOn,
        endsOn: input.endsOn ?? null,
        status: input.status,
        signedOn: input.signedOn ?? null,
        notes: input.notes ?? null,
      })
      .returning({ id: employmentContracts.id });
    if (!contract) throw new Error("Employment contract creation failed");
    return contract.id;
  });
  return employmentContractDetails(ctx, contractId);
}

export async function updateEmploymentContract(ctx: Context, input: UpdateEmploymentContractInput) {
  const current = await employmentContractOrThrow(ctx, input.id);
  const employee = await employeeOrThrow(ctx, current.employeeId);
  await requirePermission(ctx, "workforce:manage", employee.branchId);
  const startsOn = input.startsOn ?? current.startsOn;
  const endsOn = input.endsOn === undefined ? current.endsOn : input.endsOn;
  const status = input.status ?? current.status;
  const signedOn = input.signedOn === undefined ? current.signedOn : input.signedOn;
  validateEmploymentContract({ startsOn, endsOn, status, signedOn });
  if (input.contractNumber) await ensureUniqueContractNumber(ctx, input.contractNumber, current.id);
  const period =
    startsOn === current.startsOn ? null : await employmentAt(ctx, current.employeeId, startsOn);
  if (startsOn !== current.startsOn && !period) {
    badRequest("No employment period covers the contract start date");
  }
  const { id: contractId, ...values } = input;
  await ctx.db
    .update(employmentContracts)
    .set({
      ...values,
      ...(period ? { employmentPeriodId: period.id } : {}),
    })
    .where(eq(employmentContracts.id, contractId));
  return employmentContractDetails(ctx, contractId);
}

export async function deleteEmploymentContract(ctx: Context, input: ResourceIdInput) {
  const contract = await employmentContractOrThrow(ctx, input.id);
  const employee = await employeeOrThrow(ctx, contract.employeeId);
  await requirePermission(ctx, "workforce:manage", employee.branchId);
  const [deleted] = await ctx.db
    .delete(employmentContracts)
    .where(eq(employmentContracts.id, input.id))
    .returning();
  return deleted ?? null;
}
