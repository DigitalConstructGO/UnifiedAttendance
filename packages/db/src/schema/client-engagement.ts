import { sql } from "drizzle-orm";
import { boolean, check, index, jsonb, sqliteTable, text, timestamp, uuid, now } from "./columns";

import { user } from "./auth";
import { organizations } from "./organization";
import { employees } from "./employees";
import { clients, clientContacts } from "./clients";
import { AUDIT_ACTOR_TYPES, auditActorType } from "./client-enums";

export const clientNotes = sqliteTable(
  "client_notes",
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
    authorEmployeeId: uuid("author_employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    body: text("body").notNull(),
    isPinned: boolean("is_pinned").notNull().default(false),
    createdAt: timestamp("created_at").default(now).notNull(),
    updatedAt: timestamp("updated_at")
      .default(now)
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

export const crmActivities = sqliteTable(
  "crm_activities",
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
    clientContactId: uuid("client_contact_id").references(() => clientContacts.id, {
      onDelete: "set null",
    }),
    actorEmployeeId: uuid("actor_employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    note: text("note").notNull(),
    contactDate: timestamp("contact_date", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).default(now).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(now)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("crm_activities_client_date_idx").on(table.clientId, table.contactDate),
    index("crm_activities_actor_idx").on(table.actorEmployeeId),
    check("crm_activities_note_nonempty", sql`length(trim(${table.note})) > 0`),
  ],
);

export const clientAuditEntries = sqliteTable(
  "client_audit_entries",
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
    actorType: auditActorType("actor_type").notNull().default(AUDIT_ACTOR_TYPES[0]),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "restrict" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    changeSummary: jsonb("change_summary"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).default(now).notNull(),
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
