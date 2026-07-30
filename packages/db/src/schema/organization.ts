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

export const organizationStatus = pgEnum("organization_status", ["active", "suspended"]);
export const branchStatus = pgEnum("branch_status", ["active", "closed"]);

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  timezone: text("timezone").notNull().default("Africa/Addis_Ababa"),
  logoUrl: text("logo_url"),
  status: organizationStatus("status").notNull().default("active"),
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
  timezone: text("timezone").notNull().default("Africa/Addis_Ababa"),
  status: branchStatus("status").notNull().default("active"),
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
