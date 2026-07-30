import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { employees } from "./employees";
import { branches } from "./organization";

export const attendanceDeviceStatus = pgEnum("attendance_device_status", ["active", "inactive"]);

// A ZKTeco biometric installed at a branch
export const attendanceDevices = pgTable(
  "attendance_devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    model: text("model"),
    serialNumber: text("serial_number").notNull().unique(),
    // Informational only — the device initiates, so we never dial it
    ipAddress: text("ip_address"),
    // Device firmware, which determines the protocol dialect it speaks
    firmwareVersion: text("firmware_version"),
    status: attendanceDeviceStatus("status").notNull().default("active"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("attendance_devices_branch_idx").on(table.branchId)],
);

export const employeeDeviceIdentities = pgTable(
  "employee_device_identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    deviceIdentityNumber: text("device_identity_number").notNull(),
    validFrom: date("valid_from").notNull(),
    validTo: date("valid_to"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("employee_device_identities_active_number_idx")
      .on(table.deviceIdentityNumber)
      .where(sql`${table.validTo} is null`),
    index("employee_device_identities_employee_idx").on(table.employeeId),
    check(
      "employee_device_identities_valid_range",
      sql`${table.validTo} is null or ${table.validTo} >= ${table.validFrom}`,
    ),
  ],
);

export const attendanceEventDirection = pgEnum("attendance_event_direction", [
  "in",
  "out",
  "unknown",
]);

export const attendanceEvents = pgTable(
  "attendance_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deviceId: uuid("device_id")
      .notNull()
      .references(() => attendanceDevices.id, { onDelete: "restrict" }),
    deviceIdentityNumber: text("device_identity_number").notNull(),
    employeeId: uuid("employee_id").references(() => employees.id, { onDelete: "restrict" }),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    devicePunchState: text("device_punch_state"),
    deviceVerifyMode: text("device_verify_mode"),
    direction: attendanceEventDirection("direction").notNull().default("unknown"),
    rawPayload: jsonb("raw_payload"),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("attendance_events_device_identity_time_idx").on(
      table.deviceId,
      table.deviceIdentityNumber,
      table.occurredAt,
    ),
    index("attendance_events_employee_time_idx").on(table.employeeId, table.occurredAt),
    index("attendance_events_unmatched_idx")
      .on(table.occurredAt)
      .where(sql`${table.employeeId} is null`),
  ],
);

export const attendancePushBatches = pgTable(
  "attendance_push_batches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deviceSerialNumber: text("device_serial_number").notNull(),
    deviceId: uuid("device_id").references(() => attendanceDevices.id, { onDelete: "set null" }),
    /** The ADMS path the device posted to. */
    endpoint: text("endpoint").notNull(),
    rawBody: text("raw_body").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    /** Number of events extracted, once parsed. */
    eventCount: integer("event_count"),
    parseError: text("parse_error"),
  },
  (table) => [
    index("attendance_push_batches_serial_received_idx").on(
      table.deviceSerialNumber,
      table.receivedAt,
    ),
    index("attendance_push_batches_unprocessed_idx")
      .on(table.receivedAt)
      .where(sql`${table.processedAt} is null`),
  ],
);

export const attendanceDayType = pgEnum("attendance_day_type", [
  "working_day",
  "weekend",
  "holiday",
]);

export const attendanceOutcome = pgEnum("attendance_outcome", [
  "present",
  "partial",
  "absent",
  "unknown",
]);

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

export const attendanceCorrectionType = pgEnum("attendance_correction_type", [
  "add_check_in",
  "add_check_out",
  "adjust_check_in",
  "adjust_check_out",
  "mark_absent",
  "mark_present",
  "excuse_lateness",
]);

export const attendanceCorrectionStatus = pgEnum("attendance_correction_status", [
  "pending",
  "approved",
  "rejected",
]);

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
    status: attendanceCorrectionStatus("status").notNull().default("pending"),
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

export const attendanceDevicesRelations = relations(attendanceDevices, ({ one, many }) => ({
  branch: one(branches, { fields: [attendanceDevices.branchId], references: [branches.id] }),
  events: many(attendanceEvents),
  pushBatches: many(attendancePushBatches),
}));

export const attendancePushBatchesRelations = relations(attendancePushBatches, ({ one }) => ({
  device: one(attendanceDevices, {
    fields: [attendancePushBatches.deviceId],
    references: [attendanceDevices.id],
  }),
}));

export const employeeDeviceIdentitiesRelations = relations(employeeDeviceIdentities, ({ one }) => ({
  employee: one(employees, {
    fields: [employeeDeviceIdentities.employeeId],
    references: [employees.id],
  }),
}));

export const attendanceEventsRelations = relations(attendanceEvents, ({ one }) => ({
  device: one(attendanceDevices, {
    fields: [attendanceEvents.deviceId],
    references: [attendanceDevices.id],
  }),
  employee: one(employees, { fields: [attendanceEvents.employeeId], references: [employees.id] }),
}));

export const attendanceDaysRelations = relations(attendanceDays, ({ one }) => ({
  employee: one(employees, { fields: [attendanceDays.employeeId], references: [employees.id] }),
}));

export const attendanceCorrectionsRelations = relations(attendanceCorrections, ({ one }) => ({
  employee: one(employees, {
    fields: [attendanceCorrections.employeeId],
    references: [employees.id],
  }),
  disputedEvent: one(attendanceEvents, {
    fields: [attendanceCorrections.disputedEventId],
    references: [attendanceEvents.id],
  }),
  requester: one(user, { fields: [attendanceCorrections.requestedBy], references: [user.id] }),
  reviewer: one(user, { fields: [attendanceCorrections.reviewedBy], references: [user.id] }),
}));
