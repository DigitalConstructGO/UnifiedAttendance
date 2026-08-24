import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  sqliteTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  now,
} from "./columns";

import { organizations } from "./organization";
import { employees } from "./employees";
import { clients } from "./clients";
import { opportunities } from "./client-sales";
import { commercialContracts } from "./client-contracts";
import { projects } from "./client-projects";
import { invoices } from "./client-billing";
import {
  CLIENT_DOCUMENT_ACCESS_LEVELS,
  clientDocumentAccessLevel,
  clientDocumentKind,
} from "./client-enums";

export const clientDocuments = sqliteTable(
  "client_documents",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").notNull(),
    commercialContractId: uuid("commercial_contract_id"),
    opportunityId: uuid("opportunity_id"),
    projectId: uuid("project_id"),
    invoiceId: uuid("invoice_id"),
    logicalDocumentId: uuid("logical_document_id")
      .notNull()
      .$defaultFn(() => crypto.randomUUID()),
    kind: clientDocumentKind("kind").notNull(),
    version: integer("version").notNull().default(1),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    contentLength: integer("content_length").notNull(),
    storageKey: text("storage_key").notNull(),
    accessLevel: clientDocumentAccessLevel("access_level")
      .notNull()
      .default(CLIENT_DOCUMENT_ACCESS_LEVELS[0]),
    uploadedByEmployeeId: uuid("uploaded_by_employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).default(now).notNull(),
  },
  (table) => [
    uniqueIndex("client_documents_storage_key_idx").on(table.storageKey),
    uniqueIndex("client_documents_logical_version_idx").on(table.logicalDocumentId, table.version),
    index("client_documents_client_idx").on(table.clientId),
    index("client_documents_contract_idx").on(table.commercialContractId),
    index("client_documents_opportunity_idx").on(table.opportunityId),
    index("client_documents_project_idx").on(table.projectId),
    index("client_documents_invoice_idx").on(table.invoiceId),
    foreignKey({
      name: "client_documents_client_same_organization_fk",
      columns: [table.organizationId, table.clientId],
      foreignColumns: [clients.organizationId, clients.id],
    }),
    foreignKey({
      name: "client_documents_contract_same_client_fk",
      columns: [table.organizationId, table.clientId, table.commercialContractId],
      foreignColumns: [
        commercialContracts.organizationId,
        commercialContracts.clientId,
        commercialContracts.id,
      ],
    }),
    foreignKey({
      name: "client_documents_opportunity_same_organization_fk",
      columns: [table.organizationId, table.opportunityId],
      foreignColumns: [opportunities.organizationId, opportunities.id],
    }),
    foreignKey({
      name: "client_documents_project_same_client_fk",
      columns: [table.organizationId, table.clientId, table.projectId],
      foreignColumns: [projects.organizationId, projects.clientId, projects.id],
    }),
    foreignKey({
      name: "client_documents_invoice_same_client_fk",
      columns: [table.organizationId, table.clientId, table.invoiceId],
      foreignColumns: [invoices.organizationId, invoices.clientId, invoices.id],
    }),
    check("client_documents_version_positive", sql`${table.version} > 0`),
    check("client_documents_length_nonnegative", sql`${table.contentLength} >= 0`),
    check(
      "client_documents_one_context",
      sql`(${table.commercialContractId} is not null)
        + (${table.opportunityId} is not null)
        + (${table.projectId} is not null)
        + (${table.invoiceId} is not null) <= 1`,
    ),
  ],
);
