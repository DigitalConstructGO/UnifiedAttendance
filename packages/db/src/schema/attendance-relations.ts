import { relations } from "drizzle-orm";

import { attendanceCorrections } from "./attendance-corrections";
import { attendanceDays, manualAttendanceEntries } from "./attendance-days";
import {
  attendanceDevices,
  attendancePushBatches,
  employeeDeviceIdentities,
} from "./attendance-devices";
import { attendanceEvents } from "./attendance-events";
import { user } from "./auth";
import { employees } from "./employees";
import { branches } from "./organization";

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

export const manualAttendanceEntriesRelations = relations(manualAttendanceEntries, ({ one }) => ({
  employee: one(employees, {
    fields: [manualAttendanceEntries.employeeId],
    references: [employees.id],
  }),
  creator: one(user, { fields: [manualAttendanceEntries.createdBy], references: [user.id] }),
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
