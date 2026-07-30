import { desc, eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
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
import { requirePermission } from "../shared/guards";
import { employeeOrThrow, employmentAt } from "./shared";

import type {
  CreateEmploymentContractInput,
  ListEmploymentContractsInput,
  ResourceIdInput,
  UpdateEmploymentContractInput,
} from "../../validations/workforce";
import type { Context } from "../../context";

/** The joined shape every contract endpoint returns. */
const contractSelection = {
  contract: employmentContracts,
  employee: employees,
  person: people,
  period: employmentPeriods,
  department: departments,
  position: positions,
  cosigner: cosigners,
};

function contractQuery() {
  return db
    .select(contractSelection)
    .from(employmentContracts)
    .innerJoin(employees, eq(employmentContracts.employeeId, employees.id))
    .innerJoin(people, eq(employees.personId, people.id))
    .innerJoin(employmentPeriods, eq(employmentContracts.employmentPeriodId, employmentPeriods.id))
    .leftJoin(departments, eq(employmentPeriods.departmentId, departments.id))
    .leftJoin(positions, eq(employmentPeriods.positionId, positions.id))
    .innerJoin(cosigners, eq(employmentContracts.cosignerId, cosigners.id));
}

async function employmentContractOrThrow(contractId: string) {
  const [contract] = await db
    .select()
    .from(employmentContracts)
    .where(eq(employmentContracts.id, contractId))
    .limit(1);
  if (!contract) notFound("Employment contract");
  return contract;
}

async function employmentContractDetails(contractId: string) {
  const [result] = await contractQuery().where(eq(employmentContracts.id, contractId)).limit(1);
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

async function ensureUniqueContractNumber(contractNumber: string, currentId?: string) {
  const [existing] = await db
    .select({ id: employmentContracts.id })
    .from(employmentContracts)
    .where(eq(employmentContracts.contractNumber, contractNumber))
    .limit(1);
  if (existing && existing.id !== currentId) conflict("Contract number already exists");
}

export async function listEmploymentContracts(ctx: Context, input: ListEmploymentContractsInput) {
  await requirePermission(ctx, "workforce:read");
  return contractQuery()
    .where(input.employeeId ? eq(employmentContracts.employeeId, input.employeeId) : undefined)
    .orderBy(desc(employmentContracts.createdAt));
}

export async function createEmploymentContract(ctx: Context, input: CreateEmploymentContractInput) {
  const employee = await employeeOrThrow(input.employeeId);
  await requirePermission(ctx, "workforce:manage", employee.branchId);
  const period = await employmentAt(input.employeeId, input.startsOn);
  if (!period) badRequest("No employment period covers the contract start date");
  await ensureUniqueContractNumber(input.contractNumber);
  validateEmploymentContract({
    startsOn: input.startsOn,
    endsOn: input.endsOn ?? null,
    status: input.status,
    signedOn: input.signedOn ?? null,
  });
  const contractId = await db.transaction(async (tx) => {
    const [cosigner] = await tx.insert(cosigners).values(input.cosigner).returning();
    if (!cosigner) throw new Error("Cosigner creation failed");
    const [contract] = await tx
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
  return employmentContractDetails(contractId);
}

export async function updateEmploymentContract(ctx: Context, input: UpdateEmploymentContractInput) {
  const current = await employmentContractOrThrow(input.id);
  const employee = await employeeOrThrow(current.employeeId);
  await requirePermission(ctx, "workforce:manage", employee.branchId);
  const startsOn = input.startsOn ?? current.startsOn;
  const endsOn = input.endsOn === undefined ? current.endsOn : input.endsOn;
  const status = input.status ?? current.status;
  const signedOn = input.signedOn === undefined ? current.signedOn : input.signedOn;
  validateEmploymentContract({ startsOn, endsOn, status, signedOn });
  if (input.contractNumber) await ensureUniqueContractNumber(input.contractNumber, current.id);
  const period =
    startsOn === current.startsOn ? null : await employmentAt(current.employeeId, startsOn);
  if (startsOn !== current.startsOn && !period) {
    badRequest("No employment period covers the contract start date");
  }
  const { id: contractId, ...values } = input;
  await db
    .update(employmentContracts)
    .set({
      ...values,
      ...(period ? { employmentPeriodId: period.id } : {}),
    })
    .where(eq(employmentContracts.id, contractId));
  return employmentContractDetails(contractId);
}

export async function deleteEmploymentContract(ctx: Context, input: ResourceIdInput) {
  const contract = await employmentContractOrThrow(input.id);
  const employee = await employeeOrThrow(contract.employeeId);
  await requirePermission(ctx, "workforce:manage", employee.branchId);
  const [deleted] = await db
    .delete(employmentContracts)
    .where(eq(employmentContracts.id, input.id))
    .returning();
  return deleted ?? null;
}
