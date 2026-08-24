import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  sqliteEnum,
  sqliteTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  now,
} from "./columns";

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

export const attendanceDayType = sqliteEnum("attendance_day_type", ATTENDANCE_DAY_TYPES);

export const attendanceOutcome = sqliteEnum("attendance_outcome", ATTENDANCE_OUTCOMES);

export const manualAttendanceEntryKind = sqliteEnum(
  "manual_attendance_entry_kind",
  MANUAL_ATTENDANCE_ENTRY_KINDS,
);

export const attendanceDays = sqliteTable(
  "attendance_days",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
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
    hasCorrection: boolean("has_correction").notNull().default(false),
    calculatedAt: timestamp("calculated_at", { withTimezone: true })
      .default(now)
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

export const manualAttendanceEntries = sqliteTable(
  "manual_attendance_entries",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
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
    createdAt: timestamp("created_at", { withTimezone: true }).default(now).notNull(),
  },
  (table) => [
    index("manual_attendance_entries_employee_date_idx").on(table.employeeId, table.attendanceDate),
    check(
      "manual_attendance_entries_time_required",
      sql`${table.kind} not in ('check_in', 'check_out') or ${table.occurredAt} is not null`,
    ),
  ],
);
