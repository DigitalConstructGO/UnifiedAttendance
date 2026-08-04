import { sql } from "drizzle-orm";
import { check, date, index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { attendanceEvents } from "./attendance-events";
import { user } from "./auth";
import { employees } from "./employees";
export const ATTENDANCE_CORRECTION_TYPES = [
  "add_check_in",
  "add_check_out",
  "adjust_check_in",
  "adjust_check_out",
  "mark_absent",
  "mark_present",
  "excuse_lateness",
] as const;

export const attendanceCorrectionType = pgEnum(
  "attendance_correction_type",
  ATTENDANCE_CORRECTION_TYPES,
);

/**
 * A correction is applied the moment it is made, so this table is a log of what
 * was changed rather than a queue of what someone is asking for. Only HR and
 * administrators can reach it, and asking them to approve each other's edits
 * bought nothing but a delay: undoing a wrong correction is a delete, and the
 * day recomputes either way.
 *
 * `applied_by` and `applied_at` are therefore never null — every row happened.
 */
export const attendanceCorrections = pgTable(
  "attendance_corrections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    attendanceDate: date("attendance_date").notNull(),
    type: attendanceCorrectionType("type").notNull(),
    disputedEventId: uuid("disputed_event_id").references(() => attendanceEvents.id, {
      onDelete: "restrict",
    }),
    proposedTime: timestamp("proposed_time", { withTimezone: true }),
    reason: text("reason").notNull(),
    appliedBy: text("applied_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    appliedAt: timestamp("applied_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("attendance_corrections_employee_date_idx").on(table.employeeId, table.attendanceDate),
    check(
      "attendance_corrections_time_required",
      sql`${table.type} not in ('add_check_in', 'add_check_out', 'adjust_check_in', 'adjust_check_out')
        or ${table.proposedTime} is not null`,
    ),
  ],
);
