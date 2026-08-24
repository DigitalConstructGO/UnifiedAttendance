import {
  check,
  date,
  integer,
  sqliteEnum,
  sqliteTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  now,
} from "./columns";
import { sql } from "drizzle-orm";

import { employees } from "./employees";

export const NOTIFICATION_CONDITIONS = ["late", "absent"] as const;
export const notificationCondition = sqliteEnum("notification_condition", NOTIFICATION_CONDITIONS);

/**
 * Company-wide escalation tiers for the late-arrival and absence email
 * notifications. There is one ordered list of tiers per `condition`
 * ("late" | "absent"); a later ticket's scan job counts how many times the
 * condition has happened to an employee so far this week, then picks the
 * highest-`threshold` tier that is still `<= count` and sends that tier's
 * templates. No branch/org scoping — this app is single-tenant per
 * deployment, so tiers apply company-wide.
 *
 * Template placeholder syntax — later tickets' rendering logic depends on
 * this exact token format, so don't change it without updating that code:
 *   {{employeeName}}    — the employee's full name
 *   {{lateMinutes}}     — minutes late (only meaningful for "late" templates)
 *   {{occurrenceCount}} — how many times this happened so far this week
 *   {{date}}            — the date of the occurrence
 *   {{branchName}}      — the employee's branch
 */
export const notificationTiers = sqliteTable(
  "notification_tiers",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    condition: notificationCondition("condition").notNull(),
    /** Minimum weekly occurrence count at which this tier applies. */
    threshold: integer("threshold").notNull(),
    subjectTemplate: text("subject_template").notNull(),
    bodyTemplate: text("body_template").notNull(),
    createdAt: timestamp("created_at").default(now).notNull(),
    updatedAt: timestamp("updated_at")
      .default(now)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("notification_tiers_condition_threshold_idx").on(table.condition, table.threshold),
    check("notification_tiers_threshold_positive", sql`${table.threshold} > 0`),
  ],
);

/**
 * Records that a late-arrival or absence notification was already sent for
 * an employee on a given day, so the every-5-minutes scan job never sends the
 * same one twice. The unique constraint on (employee, date, condition) is
 * what makes a scan pass idempotent — inserting this row is always the last
 * step of processing an employee, after every recipient has been attempted.
 *
 * Deliberately condition-agnostic (not "late_notification_log") — the
 * absence scan (a separate ticket) reuses this same table.
 */
export const notificationLog = sqliteTable(
  "notification_log",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    attendanceDate: date("attendance_date").notNull(),
    condition: notificationCondition("condition").notNull(),
    /** The weekly occurrence count at the time this was sent, for audit purposes. */
    occurrenceCount: integer("occurrence_count").notNull(),
    /** The tier whose template was used. Kept nullable so deleting a tier later doesn't erase history. */
    tierId: uuid("tier_id").references(() => notificationTiers.id, { onDelete: "set null" }),
    sentAt: timestamp("sent_at").default(now).notNull(),
  },
  (table) => [
    uniqueIndex("notification_log_employee_date_condition_idx").on(
      table.employeeId,
      table.attendanceDate,
      table.condition,
    ),
  ],
);
