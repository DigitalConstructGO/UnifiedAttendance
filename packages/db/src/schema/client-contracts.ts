import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { organizations } from "./organization";
import { clients } from "./clients";
import { opportunities } from "./client-sales";
import {
  COMMERCIAL_CONTRACT_STATUSES,
  CONTRACT_RENEWAL_MODES,
  commercialContractStatus,
  contractRenewalMode,
} from "./client-enums";

export const commercialContracts = pgTable(
  "commercial_contracts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    opportunityId: uuid("opportunity_id").references(() => opportunities.id, {
      onDelete: "set null",
    }),
    contractCode: text("contract_code").notNull(),
    serviceName: text("service_name").notNull(),
    billingCadence: text("billing_cadence"),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    renewalMode: contractRenewalMode("renewal_mode").notNull().default(CONTRACT_RENEWAL_MODES[2]),
    status: commercialContractStatus("status").notNull().default(COMMERCIAL_CONTRACT_STATUSES[0]),
    signedOn: date("signed_on"),
    amount: numeric("amount", { precision: 14, scale: 2 }),
    currency: text("currency"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("commercial_contracts_organization_code_idx").on(
      table.organizationId,
      table.contractCode,
    ),
    uniqueIndex("commercial_contracts_organization_client_id_idx").on(
      table.organizationId,
      table.clientId,
      table.id,
    ),
    index("commercial_contracts_client_idx").on(table.clientId),
    index("commercial_contracts_opportunity_idx").on(table.opportunityId),
    index("commercial_contracts_status_idx").on(table.organizationId, table.status),
    check("commercial_contracts_valid_range", sql`${table.endsOn} > ${table.startsOn}`),
    check(
      "commercial_contracts_signed_state",
      sql`${table.status} in ('draft', 'cancelled') or ${table.signedOn} is not null`,
    ),
    check(
      "commercial_contracts_amount_currency_pair",
      sql`(${table.amount} is null and ${table.currency} is null) or (${table.amount} is not null and ${table.currency} is not null)`,
    ),
    check(
      "commercial_contracts_amount_nonnegative",
      sql`${table.amount} is null or ${table.amount} >= 0`,
    ),
  ],
);
