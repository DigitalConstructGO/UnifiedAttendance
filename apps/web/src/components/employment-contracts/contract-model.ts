import {
  EMPLOYMENT_CONTRACT_STATUSES,
  type EmploymentContractStatus,
} from "@/lib/workforce-presentation";
export { contractRequiresSignedDate } from "@/lib/workforce-presentation";

export type EmploymentContractView = "list" | "create" | "cosigners";
export type ContractStatus = EmploymentContractStatus;

export const CONTRACT_STATUSES = EMPLOYMENT_CONTRACT_STATUSES;
export const DEFAULT_CONTRACT_STATUS = CONTRACT_STATUSES[0];
export const CONTRACT_TABLE_PAGE_SIZE = 10;
export const COSIGNER_TABLE_PAGE_SIZE = 10;
