import type { z } from "zod";
import type * as validations from "@UnifiedAttendance/api/validations/workforce";

function text(data: FormData, name: string) {
  return String(data.get(name));
}

function optionalText(data: FormData, name: string) {
  return String(data.get(name)) || null;
}

/** Maps the create form onto the person and initial assignment expected by the API. */
export function createEmployeePayload(
  data: FormData,
): z.input<typeof validations.createEmployeeInput> {
  return {
    person: {
      firstName: text(data, "firstName"),
      lastName: text(data, "lastName"),
      phone: optionalText(data, "phone"),
      email: optionalText(data, "email"),
      middleName: null,
      profilePhotoUrl: null,
      nationalIdFrontUrl: null,
      nationalIdBackUrl: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
    },
    employee: {
      branchId: text(data, "branchId"),
      departmentId: optionalText(data, "departmentId"),
      positionId: optionalText(data, "positionId"),
      employmentType: text(data, "employmentType") as z.input<
        typeof validations.createEmployeeInput
      >["employee"]["employmentType"],
      hireDate: text(data, "hireDate"),
    },
  };
}

export function updateEmployeePayload(
  data: FormData,
  id: string,
): z.input<typeof validations.updateEmployeeInput> {
  return {
    id,
    person: {
      firstName: text(data, "firstName"),
      lastName: text(data, "lastName"),
      phone: optionalText(data, "phone"),
      email: optionalText(data, "email"),
    },
    employee: {
      employeeCode: text(data, "employeeCode"),
      hireDate: text(data, "hireDate"),
    },
  };
}

export function transitionPayload(
  data: FormData,
  employeeId: string,
): z.input<typeof validations.transitionEmploymentInput> {
  return {
    employeeId,
    branchId: text(data, "branchId"),
    departmentId: optionalText(data, "departmentId"),
    positionId: optionalText(data, "positionId"),
    employmentType: text(data, "employmentType") as z.input<
      typeof validations.transitionEmploymentInput
    >["employmentType"],
    status: text(data, "status") as z.input<typeof validations.transitionEmploymentInput>["status"],
    effectiveFrom: text(data, "effectiveFrom"),
  };
}
