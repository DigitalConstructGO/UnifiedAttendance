import { sql } from "drizzle-orm";
import {
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

import { employees } from "./employees";
import { branches } from "./organization";

export const ATTENDANCE_DEVICE_STATUSES = ["active", "inactive"] as const;

export const attendanceDeviceStatus = pgEnum(
  "attendance_device_status",
  ATTENDANCE_DEVICE_STATUSES,
);

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
    status: attendanceDeviceStatus("status").notNull().default(ATTENDANCE_DEVICE_STATUSES[0]),
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
