import { relations } from "drizzle-orm";

import { employees, employmentPeriods } from "./employees";
import { employmentContracts, workforceDocuments } from "./employment-contracts";
import { branches } from "./organization";
import { cosigners, departments, people, positions } from "./people";

export const cosignersRelations = relations(cosigners, ({ many }) => ({
  employmentContracts: many(employmentContracts),
  documents: many(workforceDocuments),
}));

export const peopleRelations = relations(people, ({ one }) => ({
  employee: one(employees, { fields: [people.id], references: [employees.personId] }),
}));

export const employeesRelations = relations(employees, ({ many, one }) => ({
  person: one(people, { fields: [employees.personId], references: [people.id] }),
  branch: one(branches, { fields: [employees.branchId], references: [branches.id] }),
  department: one(departments, {
    fields: [employees.departmentId],
    references: [departments.id],
  }),
  position: one(positions, { fields: [employees.positionId], references: [positions.id] }),
  employmentContracts: many(employmentContracts),
}));

export const employmentPeriodsRelations = relations(employmentPeriods, ({ many, one }) => ({
  employee: one(employees, { fields: [employmentPeriods.employeeId], references: [employees.id] }),
  branch: one(branches, { fields: [employmentPeriods.branchId], references: [branches.id] }),
  department: one(departments, {
    fields: [employmentPeriods.departmentId],
    references: [departments.id],
  }),
  position: one(positions, { fields: [employmentPeriods.positionId], references: [positions.id] }),
  employmentContracts: many(employmentContracts),
}));

export const employmentContractsRelations = relations(employmentContracts, ({ many, one }) => ({
  employee: one(employees, {
    fields: [employmentContracts.employeeId],
    references: [employees.id],
  }),
  employmentPeriod: one(employmentPeriods, {
    fields: [employmentContracts.employmentPeriodId],
    references: [employmentPeriods.id],
  }),
  cosigner: one(cosigners, {
    fields: [employmentContracts.cosignerId],
    references: [cosigners.id],
  }),
  documents: many(workforceDocuments),
}));

export const workforceDocumentsRelations = relations(workforceDocuments, ({ one }) => ({
  person: one(people, { fields: [workforceDocuments.personId], references: [people.id] }),
  cosigner: one(cosigners, { fields: [workforceDocuments.cosignerId], references: [cosigners.id] }),
  employmentContract: one(employmentContracts, {
    fields: [workforceDocuments.employmentContractId],
    references: [employmentContracts.id],
  }),
}));
