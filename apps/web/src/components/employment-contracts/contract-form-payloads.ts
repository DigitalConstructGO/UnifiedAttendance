import type { z } from "zod";
import type * as validations from "@UnifiedAttendance/api/validations/workforce";

import type { ContractStatus } from "./contract-model";

export function contractValuesFrom(data: FormData) {
  return {
    contractNumber: String(data.get("contractNumber")),
    startsOn: String(data.get("startsOn")),
    endsOn: String(data.get("endsOn")) || null,
    status: String(data.get("status")) as ContractStatus,
    signedOn: String(data.get("signedOn")) || null,
    notes: String(data.get("notes")) || null,
  } satisfies Omit<
    z.input<typeof validations.createEmploymentContractInput>,
    "employeeId" | "cosigner"
  >;
}

export function cosignerValuesFrom(data: FormData) {
  return {
    fullName: String(data.get("cosignerFullName")),
    phone: String(data.get("cosignerPhone")),
    workplace: String(data.get("cosignerWorkplace")),
  } satisfies z.input<typeof validations.createCosignerInput>;
}
