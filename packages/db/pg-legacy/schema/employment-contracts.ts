import { sql } from "drizzle-orm";
import { check, date, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { employees, employmentPeriods } from "./employees";
import { cosigners, people } from "./people";
import {
  EMPLOYMENT_CONTRACT_STATUSES,
  employmentContractStatus,
  workforceDocumentKind,
} from "./workforce-enums";

/** A signed or draft agreement for one employee assignment. */
export const employmentContracts = pgTable(
  "employment_contracts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contractNumber: text("contract_number").notNull().unique(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    employmentPeriodId: uuid("employment_period_id")
      .notNull()
      .references(() => employmentPeriods.id, { onDelete: "restrict" }),
    cosignerId: uuid("cosigner_id")
      .notNull()
      .references(() => cosigners.id, { onDelete: "restrict" }),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on"),
    status: employmentContractStatus("status").notNull().default(EMPLOYMENT_CONTRACT_STATUSES[0]),
    signedOn: date("signed_on"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("employment_contracts_employee_idx").on(table.employeeId),
    index("employment_contracts_period_idx").on(table.employmentPeriodId),
    index("employment_contracts_cosigner_idx").on(table.cosignerId),
    check(
      "employment_contracts_valid_range",
      sql`${table.endsOn} is null or ${table.endsOn} >= ${table.startsOn}`,
    ),
    check(
      "employment_contracts_signed_date",
      sql`${table.status} not in ('signed', 'ended') or ${table.signedOn} is not null`,
    ),
  ],
);

/** Private object-storage metadata. The object key is never exposed as a public URL. */
export const workforceDocuments = pgTable(
  "workforce_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id").references(() => people.id, { onDelete: "cascade" }),
    cosignerId: uuid("cosigner_id").references(() => cosigners.id, { onDelete: "cascade" }),
    employmentContractId: uuid("employment_contract_id").references(() => employmentContracts.id, {
      onDelete: "cascade",
    }),
    kind: workforceDocumentKind("kind").notNull(),
    storageKey: text("storage_key").notNull().unique(),
    contentType: text("content_type").notNull(),
    contentLength: integer("content_length").notNull(),
    finalizedAt: timestamp("finalized_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("workforce_documents_person_idx").on(table.personId),
    index("workforce_documents_cosigner_idx").on(table.cosignerId),
    index("workforce_documents_contract_idx").on(table.employmentContractId),
    check(
      "workforce_documents_one_owner",
      sql`(${table.personId} is not null)::integer
        + (${table.cosignerId} is not null)::integer
        + (${table.employmentContractId} is not null)::integer = 1`,
    ),
  ],
);
