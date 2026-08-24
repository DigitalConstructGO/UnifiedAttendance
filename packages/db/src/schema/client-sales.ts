import { sql } from "drizzle-orm";
import {
  check,
  index,
  numeric,
  sqliteTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  now,
} from "./columns";

import { user } from "./auth";
import { branches, organizations } from "./organization";
import { employees } from "./employees";
import { clients, industries, pipelineStages } from "./clients";
import { OPPORTUNITY_PRIORITIES, opportunityPriority } from "./client-enums";

export const opportunities = sqliteTable(
  "opportunities",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "restrict" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    industryId: uuid("industry_id").references(() => industries.id, { onDelete: "set null" }),
    ownerEmployeeId: uuid("owner_employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    pipelineStageId: uuid("pipeline_stage_id")
      .notNull()
      .references(() => pipelineStages.id, { onDelete: "restrict" }),
    estimatedValue: numeric("estimated_value", { precision: 14, scale: 2 }),
    currency: text("currency"),
    priority: opportunityPriority("priority").notNull().default(OPPORTUNITY_PRIORITIES[1]),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
    convertedAt: timestamp("converted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).default(now).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(now)
      .$onUpdate(() => new Date())
      .notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("opportunities_organization_id_idx").on(table.organizationId, table.id),
    index("opportunities_organization_idx").on(table.organizationId),
    index("opportunities_branch_idx").on(table.branchId),
    index("opportunities_client_idx").on(table.clientId),
    index("opportunities_owner_idx").on(table.ownerEmployeeId),
    index("opportunities_stage_idx").on(table.pipelineStageId),
    index("opportunities_last_activity_idx").on(table.lastActivityAt),
    check(
      "opportunities_value_currency_pair",
      sql`(${table.estimatedValue} is null and ${table.currency} is null) or (${table.estimatedValue} is not null and ${table.currency} is not null)`,
    ),
    check(
      "opportunities_value_nonnegative",
      sql`${table.estimatedValue} is null or ${table.estimatedValue} >= 0`,
    ),
    check(
      "opportunities_conversion_pair",
      sql`${table.convertedAt} is null or ${table.clientId} is not null`,
    ),
  ],
);

export const opportunityStageTransitions = sqliteTable(
  "opportunity_stage_transitions",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "restrict" }),
    fromPipelineStageId: uuid("from_pipeline_stage_id").references(() => pipelineStages.id, {
      onDelete: "restrict",
    }),
    toPipelineStageId: uuid("to_pipeline_stage_id")
      .notNull()
      .references(() => pipelineStages.id, { onDelete: "restrict" }),
    changedByUserId: text("changed_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).default(now).notNull(),
  },
  (table) => [
    index("opportunity_stage_transitions_opportunity_date_idx").on(
      table.opportunityId,
      table.occurredAt,
    ),
    index("opportunity_stage_transitions_target_idx").on(table.toPipelineStageId),
  ],
);
