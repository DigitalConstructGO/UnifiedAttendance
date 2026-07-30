import { sql } from "drizzle-orm";
import { boolean, check, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { organizations } from "./organization";
import { employees } from "./employees";
import { clients, clientContacts } from "./clients";
import { opportunities } from "./client-sales";
import { AUDIT_ACTOR_TYPES, auditActorType, crmActivityType } from "./client-enums";

export const clientNotes = pgTable(
  "client_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    authorEmployeeId: uuid("author_employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    body: text("body").notNull(),
    isPinned: boolean("is_pinned").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    archivedAt: timestamp("archived_at"),
  },
  (table) => [
    index("client_notes_client_created_idx").on(table.clientId, table.createdAt),
    index("client_notes_author_idx").on(table.authorEmployeeId),
    check("client_notes_body_nonempty", sql`length(trim(${table.body})) > 0`),
  ],
);

export const crmActivities = pgTable(
  "crm_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "restrict" }),
    opportunityId: uuid("opportunity_id").references(() => opportunities.id, {
      onDelete: "restrict",
    }),
    clientContactId: uuid("client_contact_id").references(() => clientContacts.id, {
      onDelete: "set null",
    }),
    actorEmployeeId: uuid("actor_employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    activityType: crmActivityType("activity_type").notNull(),
    summary: text("summary").notNull(),
    details: text("details"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("crm_activities_client_date_idx").on(table.clientId, table.occurredAt),
    index("crm_activities_opportunity_date_idx").on(table.opportunityId, table.occurredAt),
    index("crm_activities_actor_idx").on(table.actorEmployeeId),
    check(
      "crm_activities_target_required",
      sql`(${table.clientId} is not null)::integer + (${table.opportunityId} is not null)::integer >= 1`,
    ),
    check("crm_activities_summary_nonempty", sql`length(trim(${table.summary})) > 0`),
  ],
);

export const clientAuditEntries = pgTable(
  "client_audit_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    actorType: auditActorType("actor_type").notNull().default(AUDIT_ACTOR_TYPES[0]),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "restrict" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    changeSummary: jsonb("change_summary"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("client_audit_entries_client_date_idx").on(table.clientId, table.occurredAt),
    index("client_audit_entries_entity_idx").on(table.entityType, table.entityId),
    check(
      "client_audit_entries_actor_pair",
      sql`(${table.actorType} = 'system' and ${table.actorUserId} is null) or (${table.actorType} = 'user' and ${table.actorUserId} is not null)`,
    ),
    check("client_audit_entries_action_nonempty", sql`length(trim(${table.action})) > 0`),
  ],
);
