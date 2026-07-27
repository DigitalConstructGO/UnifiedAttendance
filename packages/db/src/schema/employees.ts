import { relations } from "drizzle-orm";
import {
  date,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { branches } from "./organization";

export const gender = pgEnum("gender", ["male", "female"]);
export const employmentType = pgEnum("employment_type", [
  "permanent",
  "contract",
  "part_time",
  "intern",
]);
export const employeeStatus = pgEnum("employee_status", [
  "active",
  "suspended",
  "terminated",
]);
export const activeStatus = pgEnum("active_status", ["active", "inactive"]);


export const cosigners = pgTable("cosigners", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  workplace: text("workplace"),
  nationalIdFrontUrl: text("national_id_front_url"),
  nationalIdBackUrl: text("national_id_back_url"),
  workplaceIdFrontUrl: text("workplace_id_front_url"),
  workplaceIdBackUrl: text("workplace_id_back_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


export const people = pgTable("people", {
  id: uuid("id").primaryKey().defaultRandom(),
  firstName: text("first_name").notNull(),
  middleName: text("middle_name"),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  email: text("email"),
  gender: gender("gender"),
  profilePhotoUrl: text("profile_photo_url"),
  nationalIdFrontUrl: text("national_id_front_url"),
  nationalIdBackUrl: text("national_id_back_url"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  cosignerId: uuid("cosigner_id").references(() => cosigners.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const departments = pgTable("departments", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Null means a company-level department. */
  branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  status: activeStatus("status").notNull().default("active"),
});

export const positions = pgTable("positions", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  status: activeStatus("status").notNull().default("active"),
});

export const employees = pgTable(
  "employees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .unique()
      .references(() => people.id, { onDelete: "restrict" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "restrict" }),
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "set null",
    }),
    positionId: uuid("position_id").references(() => positions.id, {
      onDelete: "set null",
    }),
    employeeCode: text("employee_code").notNull().unique(),
    employmentType: employmentType("employment_type").notNull().default("permanent"),
    hireDate: date("hire_date").notNull(),
    status: employeeStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("employees_branch_idx").on(table.branchId),
    index("employees_department_idx").on(table.departmentId),
  ],
);

export const cosignersRelations = relations(cosigners, ({ many }) => ({
  people: many(people),
}));

export const peopleRelations = relations(people, ({ one }) => ({
  employee: one(employees, { fields: [people.id], references: [employees.personId] }),
  cosigner: one(cosigners, { fields: [people.cosignerId], references: [cosigners.id] }),
}));

export const employeesRelations = relations(employees, ({ one }) => ({
  person: one(people, { fields: [employees.personId], references: [people.id] }),
  branch: one(branches, { fields: [employees.branchId], references: [branches.id] }),
  department: one(departments, {
    fields: [employees.departmentId],
    references: [departments.id],
  }),
  position: one(positions, { fields: [employees.positionId], references: [positions.id] }),
}));
