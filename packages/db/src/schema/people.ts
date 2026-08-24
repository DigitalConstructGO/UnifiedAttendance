import { sqliteTable, text, timestamp, uuid, now } from "./columns";

import { branches } from "./organization";
import { ACTIVE_STATUSES, activeStatus, gender } from "./workforce-enums";

export const cosigners = sqliteTable("cosigners", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  workplace: text("workplace"),
  nationalIdFrontUrl: text("national_id_front_url"),
  nationalIdBackUrl: text("national_id_back_url"),
  workplaceIdFrontUrl: text("workplace_id_front_url"),
  workplaceIdBackUrl: text("workplace_id_back_url"),
  createdAt: timestamp("created_at").default(now).notNull(),
});

export const people = sqliteTable("people", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  firstName: text("first_name").notNull(),
  middleName: text("middle_name"),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  email: text("email"),
  gender: gender("gender"),
  profilePhotoUrl: text("profile_photo_url"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  createdAt: timestamp("created_at").default(now).notNull(),
});

export const departments = sqliteTable("departments", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  /** Null means a company-level department. */
  branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  status: activeStatus("status").notNull().default(ACTIVE_STATUSES[0]),
});

export const positions = sqliteTable("positions", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  /** Null means the position is open to any department. */
  departmentId: uuid("department_id").references(() => departments.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  status: activeStatus("status").notNull().default(ACTIVE_STATUSES[0]),
});
