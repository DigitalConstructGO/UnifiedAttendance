import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { branches, organizations } from "./organization";
import { employees } from "./employees";
import { clients } from "./clients";
import { commercialContracts } from "./client-contracts";
import { PROJECT_STATUSES, projectStatus } from "./client-enums";

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "restrict" }),
    commercialContractId: uuid("commercial_contract_id").references(() => commercialContracts.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    managerEmployeeId: uuid("manager_employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    status: projectStatus("status").notNull().default(PROJECT_STATUSES[0]),
    progressPercent: integer("progress_percent").notNull().default(0),
    budgetAmount: numeric("budget_amount", { precision: 14, scale: 2 }).notNull(),
    currency: text("currency").notNull(),
    startsOn: date("starts_on"),
    dueOn: date("due_on").notNull(),
    completedOn: date("completed_on"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("projects_client_status_idx").on(table.clientId, table.status),
    uniqueIndex("projects_organization_client_id_idx").on(
      table.organizationId,
      table.clientId,
      table.id,
    ),
    index("projects_branch_idx").on(table.branchId),
    index("projects_manager_idx").on(table.managerEmployeeId),
    index("projects_contract_idx").on(table.commercialContractId),
    foreignKey({
      name: "projects_contract_same_client_fk",
      columns: [table.organizationId, table.clientId, table.commercialContractId],
      foreignColumns: [
        commercialContracts.organizationId,
        commercialContracts.clientId,
        commercialContracts.id,
      ],
    }),
    check("projects_progress_range", sql`${table.progressPercent} between 0 and 100`),
    check(
      "projects_date_range",
      sql`${table.startsOn} is null or ${table.dueOn} >= ${table.startsOn}`,
    ),
    check(
      "projects_completion_state",
      sql`(${table.status} = 'completed' and ${table.progressPercent} = 100 and ${table.completedOn} is not null) or (${table.status} <> 'completed' and ${table.completedOn} is null)`,
    ),
  ],
);
