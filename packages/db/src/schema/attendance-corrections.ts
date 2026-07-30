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
export const ATTENDANCE_CORRECTION_STATUSES = ["pending", "approved", "rejected"] as const;
export const PENDING_CORRECTION_STATUS = ATTENDANCE_CORRECTION_STATUSES[0];

export const attendanceCorrectionType = pgEnum(
  "attendance_correction_type",
  ATTENDANCE_CORRECTION_TYPES,
);

export const attendanceCorrectionStatus = pgEnum(
  "attendance_correction_status",
  ATTENDANCE_CORRECTION_STATUSES,
);

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
    status: attendanceCorrectionStatus("status").notNull().default(PENDING_CORRECTION_STATUS),
    requestedBy: text("requested_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow().notNull(),
    reviewedBy: text("reviewed_by").references(() => user.id, { onDelete: "restrict" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewNote: text("review_note"),
  },
  (table) => [
    index("attendance_corrections_employee_date_idx").on(table.employeeId, table.attendanceDate),
    index("attendance_corrections_status_idx")
      .on(table.status)
      .where(sql`${table.status} = 'pending'`),
    check(
      "attendance_corrections_reviewed_when_decided",
      sql`(${table.status} = 'pending' and ${table.reviewedBy} is null and ${table.reviewedAt} is null)
        or (${table.status} <> 'pending' and ${table.reviewedBy} is not null and ${table.reviewedAt} is not null)`,
    ),
    check(
      "attendance_corrections_time_required",
      sql`${table.type} not in ('add_check_in', 'add_check_out', 'adjust_check_in', 'adjust_check_out')
        or ${table.proposedTime} is not null`,
    ),
  ],
);
