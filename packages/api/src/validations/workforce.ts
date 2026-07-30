import { z } from "zod";

import { date, id, nullableText, nullableUrl, text } from "./shared";

const personInput = z.object({
  firstName: text,
  middleName: nullableText,
  lastName: text,
  phone: nullableText,
  email: z.email().nullable().optional(),
  gender: z.enum(["male", "female"]).nullable().optional(),
  profilePhotoUrl: nullableUrl,
  nationalIdFrontUrl: nullableUrl,
  nationalIdBackUrl: nullableUrl,
  emergencyContactName: nullableText,
  emergencyContactPhone: nullableText,
  cosignerId: id.nullable().optional(),
});

export const resourceIdInput = z.object({ id });

export const createDepartmentInput = z.object({ name: text, branchId: id.nullable().optional() });
export const updateDepartmentInput = z.object({
  id,
  name: text.optional(),
  status: z.enum(["active", "inactive"]).optional(),
  branchId: id.nullable().optional(),
});

export const createPositionInput = z.object({ title: text, description: nullableText });
export const updatePositionInput = z.object({
  id,
  title: text.optional(),
  description: nullableText,
  status: z.enum(["active", "inactive"]).optional(),
});

export const createCosignerInput = z.object({
  fullName: text,
  phone: nullableText,
  workplace: nullableText,
  nationalIdFrontUrl: nullableUrl,
  nationalIdBackUrl: nullableUrl,
  workplaceIdFrontUrl: nullableUrl,
  workplaceIdBackUrl: nullableUrl,
});
export const updateCosignerInput = createCosignerInput.partial().extend({ id });

export const listEmployeesInput = z.object({ branchId: id });

export const createEmployeeInput = z.object({
  person: personInput,
  employee: z.object({
    branchId: id,
    departmentId: id.nullable().optional(),
    positionId: id.nullable().optional(),
    employeeCode: text,
    employmentType: z.enum(["permanent", "contract", "part_time", "intern"]).default("permanent"),
    hireDate: date,
  }),
});

export const updateEmployeeInput = z.object({
  id,
  person: personInput.partial().optional(),
  employee: z
    .object({
      branchId: id.optional(),
      departmentId: id.nullable().optional(),
      positionId: id.nullable().optional(),
      employeeCode: text.optional(),
      employmentType: z.enum(["permanent", "contract", "part_time", "intern"]).optional(),
      hireDate: date.optional(),
      status: z.enum(["active", "suspended", "terminated"]).optional(),
    })
    .optional(),
});

export type ResourceIdInput = z.output<typeof resourceIdInput>;
export type CreateDepartmentInput = z.output<typeof createDepartmentInput>;
export type UpdateDepartmentInput = z.output<typeof updateDepartmentInput>;
export type CreatePositionInput = z.output<typeof createPositionInput>;
export type UpdatePositionInput = z.output<typeof updatePositionInput>;
export type CreateCosignerInput = z.output<typeof createCosignerInput>;
export type UpdateCosignerInput = z.output<typeof updateCosignerInput>;
export type ListEmployeesInput = z.output<typeof listEmployeesInput>;
export type CreateEmployeeInput = z.output<typeof createEmployeeInput>;
export type UpdateEmployeeInput = z.output<typeof updateEmployeeInput>;
