import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { branches, organizations } from "./organization";
import { activeStatus } from "./workforce-enums";
import { employees } from "./employees";
import {
  CLIENT_STATUSES,
  clientPriority,
  clientStatus,
  pipelineStageOutcome,
} from "./client-enums";

export const industries = pgTable(
  "industries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    status: activeStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("industries_organization_name_idx").on(table.organizationId, table.name),
    index("industries_organization_status_idx").on(table.organizationId, table.status),
  ],
);

export const clientTypes = pgTable(
  "client_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    status: activeStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("client_types_organization_name_idx").on(table.organizationId, table.name),
    index("client_types_organization_status_idx").on(table.organizationId, table.status),
  ],
);

export const companySizes = pgTable(
  "company_sizes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    status: activeStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("company_sizes_organization_name_idx").on(table.organizationId, table.name),
    index("company_sizes_organization_status_idx").on(table.organizationId, table.status),
  ],
);

export const pipelineStages = pgTable(
  "pipeline_stages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull(),
    outcome: pipelineStageOutcome("outcome").notNull().default("open"),
    status: activeStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("pipeline_stages_organization_name_idx").on(table.organizationId, table.name),
    uniqueIndex("pipeline_stages_organization_position_idx").on(
      table.organizationId,
      table.position,
    ),
    index("pipeline_stages_organization_status_idx").on(table.organizationId, table.status),
    check("pipeline_stages_positive_position", sql`${table.position} > 0`),
  ],
);

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "restrict" }),
    ownerEmployeeId: uuid("owner_employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    clientCode: text("client_code").notNull(),
    legalName: text("legal_name").notNull(),
    tradingName: text("trading_name"),
    industryId: uuid("industry_id")
      .notNull()
      .references(() => industries.id, { onDelete: "restrict" }),
    clientTypeId: uuid("client_type_id")
      .notNull()
      .references(() => clientTypes.id, { onDelete: "restrict" }),
    phone: text("phone"),
    email: text("email"),
    tin: text("tin"),
    vatNumber: text("vat_number"),
    registrationNumber: text("registration_number"),
    businessLicenseNumber: text("business_license_number"),
    website: text("website"),
    relationshipStartedOn: date("relationship_started_on").notNull(),
    priority: clientPriority("priority"),
    status: clientStatus("status").notNull().default(CLIENT_STATUSES[0]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    archivedAt: timestamp("archived_at"),
  },
  (table) => [
    uniqueIndex("clients_organization_code_idx").on(table.organizationId, table.clientCode),
    uniqueIndex("clients_organization_id_idx").on(table.organizationId, table.id),
    uniqueIndex("clients_organization_tin_idx")
      .on(table.organizationId, table.tin)
      .where(sql`${table.tin} is not null`),
    index("clients_branch_idx").on(table.branchId),
    index("clients_owner_idx").on(table.ownerEmployeeId),
    index("clients_industry_idx").on(table.industryId),
    index("clients_type_idx").on(table.clientTypeId),
    index("clients_status_idx").on(table.organizationId, table.status),
    check(
      "clients_archived_timestamp",
      sql`${table.status} <> 'archived' or ${table.archivedAt} is not null`,
    ),
  ],
);

export const clientContacts = pgTable(
  "client_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    role: text("role"),
    phone: text("phone"),
    email: text("email"),
    isPrimary: boolean("is_primary").notNull().default(false),
    status: activeStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("client_contacts_client_idx").on(table.clientId),
    uniqueIndex("client_contacts_primary_idx")
      .on(table.clientId)
      .where(sql`${table.status} = 'active' and ${table.isPrimary} = true`),
    check(
      "client_contacts_reachable_channel",
      sql`${table.status} <> 'active' or nullif(trim(${table.phone}), '') is not null or nullif(trim(${table.email}), '') is not null`,
    ),
  ],
);

export const clientOwnerAssignments = pgTable(
  "client_owner_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    ownerEmployeeId: uuid("owner_employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    assignedByUserId: text("assigned_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("client_owner_assignments_client_dates_idx").on(
      table.clientId,
      table.effectiveFrom,
      table.effectiveTo,
    ),
    index("client_owner_assignments_owner_idx").on(table.ownerEmployeeId),
    uniqueIndex("client_owner_assignments_open_client_idx")
      .on(table.clientId)
      .where(sql`${table.effectiveTo} is null`),
    check(
      "client_owner_assignments_valid_range",
      sql`${table.effectiveTo} is null or ${table.effectiveTo} >= ${table.effectiveFrom}`,
    ),
  ],
);
