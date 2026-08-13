import { z } from "zod";

import {
  ACTIVE_STATUSES,
  EMPLOYEE_STATUSES,
  EMPLOYMENT_CONTRACT_STATUSES,
  EMPLOYMENT_TYPES,
  GENDERS,
  WORKFORCE_DOCUMENT_KINDS,
} from "@UnifiedAttendance/db/schema/workforce-enums";

import { date, id, nullableText, nullableUrl, text } from "./shared";

const WORKFORCE_DOCUMENT_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;
const MAX_WORKFORCE_DOCUMENT_BYTES = 10 * 1024 * 1024;
const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;

// The photo and national-id pointers are deliberately absent: they are owned
// by the person's workforce documents and set when one is finalized.
const personInput = z.object({
  firstName: text,
  middleName: nullableText,
  lastName: text,
  phone: nullableText,
  email: z.email().nullable().optional(),
  gender: z.enum(GENDERS).nullable().optional(),
  emergencyContactName: nullableText,
  emergencyContactPhone: nullableText,
});

export const resourceIdInput = z.object({ id });

export const createDepartmentInput = z.object({ name: text, branchId: id.nullable().optional() });
export const updateDepartmentInput = z.object({
  id,
  name: text.optional(),
  status: z.enum(ACTIVE_STATUSES).optional(),
  branchId: id.nullable().optional(),
});

export const createPositionInput = z.object({
  title: text,
  description: nullableText,
  departmentId: id.nullable().optional(),
});
export const updatePositionInput = z.object({
  id,
  title: text.optional(),
  description: nullableText,
  status: z.enum(ACTIVE_STATUSES).optional(),
  departmentId: id.nullable().optional(),
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

export const employmentContractStatus = z.enum(EMPLOYMENT_CONTRACT_STATUSES);

const employmentContractValues = z.object({
  contractNumber: text,
  startsOn: date,
  endsOn: date.nullable().optional(),
  status: employmentContractStatus,
  signedOn: date.nullable().optional(),
  notes: nullableText,
});

export const listEmploymentContractsInput = z.object({ employeeId: id.optional() });
export const createEmploymentContractInput = employmentContractValues
  .extend({
    employeeId: id,
    cosigner: createCosignerInput,
    status: employmentContractStatus.default(EMPLOYMENT_CONTRACT_STATUSES[0]),
  })
  .superRefine((value, issue) => {
    if (value.endsOn && value.endsOn < value.startsOn) {
      issue.addIssue({
        code: "custom",
        path: ["endsOn"],
        message: "The contract end date cannot be before its start date",
      });
    }
    if ((value.status === "signed" || value.status === "ended") && !value.signedOn) {
      issue.addIssue({
        code: "custom",
        path: ["signedOn"],
        message: "A signed date is required for signed or ended contracts",
      });
    }
  });
export const updateEmploymentContractInput = employmentContractValues.partial().extend({ id });

export const listEmployeesInput = z.object({
  branchId: id,
  archived: z.stringbool().optional(),
});

const employmentValues = z.object({
  branchId: id,
  departmentId: id.nullable().optional(),
  positionId: id.nullable().optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  status: z.enum(EMPLOYEE_STATUSES),
  effectiveFrom: date,
});

export const createEmployeeInput = z.object({
  person: personInput,
  employee: z.object({
    branchId: id,
    departmentId: id.nullable().optional(),
    positionId: id.nullable().optional(),
    /** Left out, the ID is generated from the organization, branch and department. */
    employeeCode: text.optional(),
    employmentType: z.enum(EMPLOYMENT_TYPES).default(EMPLOYMENT_TYPES[0]),
    hireDate: date,
    hasFixedSchedule: z.boolean().optional(),
  }),
});

export const transitionEmploymentInput = employmentValues.extend({ employeeId: id });

export const listEmploymentPeriodsInput = z.object({ employeeId: id });

export const createWorkforceDocumentInput = z
  .object({
    personId: id.optional(),
    cosignerId: id.optional(),
    employmentContractId: id.optional(),
    kind: z.enum(WORKFORCE_DOCUMENT_KINDS),
    contentType: z.enum(WORKFORCE_DOCUMENT_CONTENT_TYPES),
    contentLength: z.number().int().positive().max(MAX_WORKFORCE_DOCUMENT_BYTES),
  })
  .refine(
    (value) =>
      [value.personId, value.cosignerId, value.employmentContractId].filter(Boolean).length === 1,
    {
      message: "A document must belong to exactly one person, cosigner, or employment contract",
    },
  )
  .superRefine((value, issue) => {
    if (value.kind === "employment_contract" && !value.employmentContractId) {
      issue.addIssue({
        code: "custom",
        path: ["employmentContractId"],
        message: "Contract files must belong to an employment contract",
      });
    }
    if (value.kind !== "employment_contract" && value.employmentContractId) {
      issue.addIssue({
        code: "custom",
        path: ["kind"],
        message: "Only contract files can belong to an employment contract",
      });
    }
    if (value.kind === "profile_photo" && value.contentType === "application/pdf") {
      issue.addIssue({
        code: "custom",
        path: ["contentType"],
        message: "Profile photos must be images",
      });
    }
    if (value.kind === "profile_photo" && value.contentLength > MAX_PROFILE_PHOTO_BYTES) {
      issue.addIssue({
        code: "custom",
        path: ["contentLength"],
        message: "Profile photos must be 5 MB or smaller",
      });
    }
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
      employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
      hireDate: date.optional(),
      status: z.enum(EMPLOYEE_STATUSES).optional(),
      hasFixedSchedule: z.boolean().optional(),
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
export type ListEmploymentContractsInput = z.output<typeof listEmploymentContractsInput>;
export type CreateEmploymentContractInput = z.output<typeof createEmploymentContractInput>;
export type UpdateEmploymentContractInput = z.output<typeof updateEmploymentContractInput>;
export type ListEmployeesInput = z.output<typeof listEmployeesInput>;
export type CreateEmployeeInput = z.output<typeof createEmployeeInput>;
export type UpdateEmployeeInput = z.output<typeof updateEmployeeInput>;
export type TransitionEmploymentInput = z.output<typeof transitionEmploymentInput>;
export type ListEmploymentPeriodsInput = z.output<typeof listEmploymentPeriodsInput>;
export type CreateWorkforceDocumentInput = z.output<typeof createWorkforceDocumentInput>;
