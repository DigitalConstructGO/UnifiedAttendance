import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { attendanceDevices } from "./attendance-devices";
import { employees } from "./employees";

export const ATTENDANCE_EVENT_DIRECTIONS = ["in", "out", "unknown"] as const;

export const attendanceEventDirection = pgEnum(
  "attendance_event_direction",
  ATTENDANCE_EVENT_DIRECTIONS,
);

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
    direction: attendanceEventDirection("direction")
      .notNull()
      .default(ATTENDANCE_EVENT_DIRECTIONS[2]),
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
