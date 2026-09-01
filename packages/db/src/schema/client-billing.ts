import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  index,
  numeric,
  sqliteEnum,
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
import { projects } from "./client-projects";

export const INVOICE_LIFECYCLE_STATUSES = ["draft", "issued", "void"] as const;
export const invoiceLifecycleStatus = sqliteEnum(
  "invoice_lifecycle_status",
  INVOICE_LIFECYCLE_STATUSES,
);

export const invoices = sqliteTable(
  "invoices",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").notNull(),
    projectId: uuid("project_id"),
    commercialContractId: uuid("commercial_contract_id"),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "restrict" }),
    invoiceNumber: text("invoice_number").notNull(),
    issuedOn: date("issued_on"),
    dueOn: date("due_on"),
    currency: text("currency").notNull(),
    totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull(),
    description: text("description"),
    note: text("note"),
    lifecycleStatus: invoiceLifecycleStatus("lifecycle_status").notNull().default("draft"),
    createdAt: timestamp("created_at").default(now).notNull(),
    updatedAt: timestamp("updated_at")
      .default(now)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("invoices_organization_number_idx").on(table.organizationId, table.invoiceNumber),
    uniqueIndex("invoices_organization_id_idx").on(table.organizationId, table.id),
    uniqueIndex("invoices_organization_client_id_idx").on(
      table.organizationId,
      table.clientId,
      table.id,
    ),
    index("invoices_client_idx").on(table.clientId),
    index("invoices_project_idx").on(table.projectId),
    index("invoices_contract_idx").on(table.commercialContractId),
    index("invoices_branch_idx").on(table.branchId),
    index("invoices_due_date_idx").on(table.dueOn),
    index("invoices_lifecycle_status_idx").on(table.organizationId, table.lifecycleStatus),
    check("invoices_total_positive", sql`${table.totalAmount} > 0`),
    check(
      "invoices_issued_dates",
      sql`(${table.lifecycleStatus} = 'draft' and ${table.issuedOn} is null and ${table.dueOn} is null) or (${table.lifecycleStatus} <> 'draft' and ${table.issuedOn} is not null and ${table.dueOn} is not null and ${table.dueOn} >= ${table.issuedOn})`,
    ),
    foreignKey({
      name: "invoices_client_same_organization_fk",
      columns: [table.organizationId, table.clientId],
      foreignColumns: [clients.organizationId, clients.id],
    }),
    foreignKey({
      name: "invoices_project_same_client_fk",
      columns: [table.organizationId, table.clientId, table.projectId],
      foreignColumns: [projects.organizationId, projects.clientId, projects.id],
    }),
    foreignKey({
      name: "invoices_contract_same_client_fk",
      columns: [table.organizationId, table.clientId, table.commercialContractId],
      foreignColumns: [
        commercialContracts.organizationId,
        commercialContracts.clientId,
        commercialContracts.id,
      ],
    }),
  ],
);

export const invoicePayments = sqliteTable(
  "invoice_payments",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    currency: text("currency").notNull(),
    paidOn: date("paid_on").notNull(),
    method: text("method"),
    reference: text("reference"),
    recordedByEmployeeId: uuid("recorded_by_employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    archivedAt: timestamp("archived_at"),
    createdAt: timestamp("created_at").default(now).notNull(),
  },
  (table) => [
    index("invoice_payments_invoice_date_idx").on(table.invoiceId, table.paidOn),
    index("invoice_payments_organization_date_idx").on(table.organizationId, table.paidOn),
    index("invoice_payments_recorder_idx").on(table.recordedByEmployeeId),
    check("invoice_payments_amount_positive", sql`${table.amount} > 0`),
    foreignKey({
      name: "invoice_payments_invoice_same_organization_fk",
      columns: [table.organizationId, table.invoiceId],
      foreignColumns: [invoices.organizationId, invoices.id],
    }),
  ],
);
