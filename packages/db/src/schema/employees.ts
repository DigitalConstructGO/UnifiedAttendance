import { isNull, sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { branches } from "./organization";
import { departments, people, positions } from "./people";
import {
  EMPLOYEE_STATUSES,
  EMPLOYMENT_TYPES,
  employeeStatus,
  employmentType,
} from "./workforce-enums";

export const employees = pgTable(
  "employees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .unique()
      .references(() => people.id, { onDelete: "restrict" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "restrict" }),
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "set null",
    }),
    positionId: uuid("position_id").references(() => positions.id, {
      onDelete: "set null",
    }),
    employeeCode: text("employee_code").notNull().unique(),
    employmentType: employmentType("employment_type").notNull().default(EMPLOYMENT_TYPES[0]),
    hireDate: date("hire_date").notNull(),
    status: employeeStatus("status").notNull().default(EMPLOYEE_STATUSES[0]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("employees_branch_idx").on(table.branchId),
    index("employees_department_idx").on(table.departmentId),
  ],
);

/**
 * An effective-dated assignment. Employee keeps the stable staff identity;
 * periods preserve where and how that person worked at any given date.
 */
export const employmentPeriods = pgTable(
  "employment_periods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "restrict" }),
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "set null",
    }),
    positionId: uuid("position_id").references(() => positions.id, { onDelete: "set null" }),
    employmentType: employmentType("employment_type").notNull().default(EMPLOYMENT_TYPES[0]),
    status: employeeStatus("status").notNull().default(EMPLOYEE_STATUSES[0]),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("employment_periods_employee_dates_idx").on(
      table.employeeId,
      table.effectiveFrom,
      table.effectiveTo,
    ),
    index("employment_periods_branch_dates_idx").on(
      table.branchId,
      table.effectiveFrom,
      table.effectiveTo,
    ),
    uniqueIndex("employment_periods_open_employee_idx")
      .on(table.employeeId)
      .where(isNull(table.effectiveTo)),
    check(
      "employment_periods_valid_range",
      sql`${table.effectiveTo} is null or ${table.effectiveTo} >= ${table.effectiveFrom}`,
    ),
  ],
);
