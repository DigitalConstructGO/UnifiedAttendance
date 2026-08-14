import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const DEFAULT_TIME_ZONE = "Africa/Addis_Ababa";
export const ORGANIZATION_STATUSES = ["active", "suspended"] as const;
export const BRANCH_STATUSES = ["active", "closed"] as const;

export const organizationStatus = pgEnum("organization_status", ORGANIZATION_STATUSES);
export const branchStatus = pgEnum("branch_status", BRANCH_STATUSES);

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  timezone: text("timezone").notNull().default(DEFAULT_TIME_ZONE),
  logoUrl: text("logo_url"),
  /** Printed on documents such as invoices; blank fields are simply omitted. */
  tin: text("tin"),
  address: text("address"),
  status: organizationStatus("status").notNull().default(ORGANIZATION_STATUSES[0]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const branches = pgTable("branches", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  address: text("address"),
  timezone: text("timezone").notNull().default(DEFAULT_TIME_ZONE),
  status: branchStatus("status").notNull().default(BRANCH_STATUSES[0]),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const branchWorkingDays = pgTable(
  "branch_working_days",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    weekday: integer("weekday").notNull(),
    isWorkingDay: boolean("is_working_day").notNull().default(true),
    openingTime: time("opening_time"),
    closingTime: time("closing_time"),
  },
  (table) => [
    uniqueIndex("branch_working_days_branch_weekday_idx").on(table.branchId, table.weekday),
    check(
      "branch_working_days_within_one_day",
      sql`${table.openingTime} is null or ${table.closingTime} is null or ${table.closingTime} > ${table.openingTime}`,
    ),
  ],
);

export const holidays = pgTable(
  "holidays",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Null means the holiday applies to every branch. */
    branchId: uuid("branch_id").references(() => branches.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    holidayDate: date("holiday_date").notNull(),
  },
  (table) => [index("holidays_date_idx").on(table.holidayDate)],
);

export const branchesRelations = relations(branches, ({ many }) => ({
  workingDays: many(branchWorkingDays),
  holidays: many(holidays),
}));

export const branchWorkingDaysRelations = relations(branchWorkingDays, ({ one }) => ({
  branch: one(branches, { fields: [branchWorkingDays.branchId], references: [branches.id] }),
}));

export const holidaysRelations = relations(holidays, ({ one }) => ({
  branch: one(branches, { fields: [holidays.branchId], references: [branches.id] }),
}));
