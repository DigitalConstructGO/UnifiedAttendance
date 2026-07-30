import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { employees } from "./employees";

export const ATTENDANCE_DAY_TYPES = ["working_day", "weekend", "holiday"] as const;
export const ATTENDANCE_OUTCOMES = ["present", "partial", "absent", "unknown"] as const;
export const MANUAL_ATTENDANCE_ENTRY_KINDS = [
  "check_in",
  "check_out",
  "mark_present",
  "mark_absent",
] as const;

export const attendanceDayType = pgEnum("attendance_day_type", ATTENDANCE_DAY_TYPES);

export const attendanceOutcome = pgEnum("attendance_outcome", ATTENDANCE_OUTCOMES);

export const manualAttendanceEntryKind = pgEnum(
  "manual_attendance_entry_kind",
  MANUAL_ATTENDANCE_ENTRY_KINDS,
);

export const attendanceDays = pgTable(
  "attendance_days",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    attendanceDate: date("attendance_date").notNull(),
    dayType: attendanceDayType("day_type").notNull(),
    outcome: attendanceOutcome("outcome").notNull(),
    firstIn: timestamp("first_in", { withTimezone: true }),
    lastOut: timestamp("last_out", { withTimezone: true }),
    workedMinutes: integer("worked_minutes"),
    lateMinutes: integer("late_minutes"),
    earlyDepartureMinutes: integer("early_departure_minutes"),
    missingCheckIn: boolean("missing_check_in").notNull().default(false),
    missingCheckOut: boolean("missing_check_out").notNull().default(false),
    hasApprovedCorrection: boolean("has_approved_correction").notNull().default(false),
    calculatedAt: timestamp("calculated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("attendance_days_employee_date_idx").on(table.employeeId, table.attendanceDate),
    index("attendance_days_date_outcome_idx").on(table.attendanceDate, table.outcome),
    check(
      "attendance_days_out_after_in",
      sql`${table.lastOut} is null or ${table.firstIn} is null or ${table.lastOut} >= ${table.firstIn}`,
    ),
    check(
      "attendance_days_non_negative_minutes",
      sql`(${table.workedMinutes} is null or ${table.workedMinutes} >= 0)
        and (${table.lateMinutes} is null or ${table.lateMinutes} >= 0)
        and (${table.earlyDepartureMinutes} is null or ${table.earlyDepartureMinutes} >= 0)`,
    ),
  ],
);

/** Manual entries are an auditable overlay, never a mutation of biometric data. */
export const manualAttendanceEntries = pgTable(
  "manual_attendance_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    attendanceDate: date("attendance_date").notNull(),
    kind: manualAttendanceEntryKind("kind").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }),
    reason: text("reason").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("manual_attendance_entries_employee_date_idx").on(table.employeeId, table.attendanceDate),
    check(
      "manual_attendance_entries_time_required",
      sql`${table.kind} not in ('check_in', 'check_out') or ${table.occurredAt} is not null`,
    ),
  ],
);
