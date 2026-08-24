import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  index,
  sqliteTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  now,
} from "./columns";

import { branches, organizations } from "./organization";
import { employees } from "./employees";
import { clients } from "./clients";
import { commercialContracts } from "./client-contracts";
import { PROJECT_STATUSES, projectStatus } from "./client-enums";

export const projects = sqliteTable(
  "projects",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
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
    startsOn: date("starts_on"),
    dueOn: date("due_on").notNull(),
    completedOn: date("completed_on"),
    createdAt: timestamp("created_at").default(now).notNull(),
    updatedAt: timestamp("updated_at")
      .default(now)
      .$onUpdate(() => new Date())
      .notNull(),
    archivedAt: timestamp("archived_at"),
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
    check(
      "projects_date_range",
      sql`${table.startsOn} is null or ${table.dueOn} >= ${table.startsOn}`,
    ),
    check(
      "projects_completion_state",
      sql`(${table.status} = 'completed' and ${table.completedOn} is not null) or (${table.status} <> 'completed' and ${table.completedOn} is null)`,
    ),
  ],
);
