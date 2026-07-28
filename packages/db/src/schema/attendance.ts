import { relations, sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { employees } from "./employees";

export const attendanceDayStatus = pgEnum("attendance_day_status", [
  "present",
  "late",
  "absent",
  "half_day",
  "holiday",
  "weekend",
  "missing_punch",
]);

export const attendanceDays = pgTable(
  "attendance_days",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    attendanceDate: date("attendance_date").notNull(),
    firstIn: timestamp("first_in"),
    lastOut: timestamp("last_out"),
    status: attendanceDayStatus("status").notNull(),
    calculatedAt: timestamp("calculated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("attendance_days_employee_date_idx").on(table.employeeId, table.attendanceDate),
    index("attendance_days_date_status_idx").on(table.attendanceDate, table.status),
    check(
      "attendance_days_out_after_in",
      sql`${table.lastOut} is null or ${table.firstIn} is null or ${table.lastOut} >= ${table.firstIn}`,
    ),
  ],
);

export const attendanceDaysRelations = relations(attendanceDays, ({ one }) => ({
  employee: one(employees, { fields: [attendanceDays.employeeId], references: [employees.id] }),
}));
