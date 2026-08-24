import { sqliteEnum } from "./columns";

export const GENDERS = ["male", "female"] as const;
export const EMPLOYMENT_TYPES = ["permanent", "contract", "part_time", "intern"] as const;
export const EMPLOYEE_STATUSES = ["active", "suspended", "terminated"] as const;
export const ACTIVE_STATUSES = ["active", "inactive"] as const;
export const EMPLOYMENT_CONTRACT_STATUSES = ["draft", "signed", "ended", "cancelled"] as const;
export const WORKFORCE_DOCUMENT_KINDS = [
  "profile_photo",
  "national_id_front",
  "national_id_back",
  "workplace_id_front",
  "workplace_id_back",
  "employment_contract",
] as const;

export const gender = sqliteEnum("gender", GENDERS);

export const employmentType = sqliteEnum("employment_type", EMPLOYMENT_TYPES);

export const employeeStatus = sqliteEnum("employee_status", EMPLOYEE_STATUSES);

export const activeStatus = sqliteEnum("active_status", ACTIVE_STATUSES);

export const employmentContractStatus = sqliteEnum(
  "employment_contract_status",
  EMPLOYMENT_CONTRACT_STATUSES,
);

export const workforceDocumentKind = sqliteEnum(
  "workforce_document_kind",
  WORKFORCE_DOCUMENT_KINDS,
);
