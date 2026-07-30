import { relations } from "drizzle-orm";
import { isNull, sql } from "drizzle-orm";
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

import { branches } from "./organization";

export const gender = pgEnum("gender", ["male", "female"]);
export const employmentType = pgEnum("employment_type", [
  "permanent",
  "contract",
  "part_time",
  "intern",
]);
export const employeeStatus = pgEnum("employee_status", ["active", "suspended", "terminated"]);
export const activeStatus = pgEnum("active_status", ["active", "inactive"]);
export const workforceDocumentKind = pgEnum("workforce_document_kind", [
  "profile_photo",
  "national_id_front",
  "national_id_back",
  "workplace_id_front",
  "workplace_id_back",
]);

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

/**
 * An effective-dated assignment. Employee keeps the stable staff identity;
 * periods preserve where and how that person worked at any given date.
 */
export const employmentPeriods = pgTable(
  "employment_periods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "restrict" }),
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "set null",
    }),
    positionId: uuid("position_id").references(() => positions.id, { onDelete: "set null" }),
    employmentType: employmentType("employment_type").notNull().default("permanent"),
    status: employeeStatus("status").notNull().default("active"),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("employment_periods_employee_dates_idx").on(
      table.employeeId,
      table.effectiveFrom,
      table.effectiveTo,
    ),
    index("employment_periods_branch_dates_idx").on(
      table.branchId,
      table.effectiveFrom,
      table.effectiveTo,
    ),
    uniqueIndex("employment_periods_open_employee_idx")
      .on(table.employeeId)
      .where(isNull(table.effectiveTo)),
    check(
      "employment_periods_valid_range",
      sql`${table.effectiveTo} is null or ${table.effectiveTo} >= ${table.effectiveFrom}`,
    ),
  ],
);

/** Private object-storage metadata. The object key is never exposed as a public URL. */
export const workforceDocuments = pgTable(
  "workforce_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id").references(() => people.id, { onDelete: "cascade" }),
    cosignerId: uuid("cosigner_id").references(() => cosigners.id, { onDelete: "cascade" }),
    kind: workforceDocumentKind("kind").notNull(),
    storageKey: text("storage_key").notNull().unique(),
    contentType: text("content_type").notNull(),
    contentLength: integer("content_length").notNull(),
    finalizedAt: timestamp("finalized_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("workforce_documents_person_idx").on(table.personId),
    index("workforce_documents_cosigner_idx").on(table.cosignerId),
    check(
      "workforce_documents_one_owner",
      sql`(${table.personId} is not null and ${table.cosignerId} is null)
        or (${table.personId} is null and ${table.cosignerId} is not null)`,
    ),
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

export const employmentPeriodsRelations = relations(employmentPeriods, ({ one }) => ({
  employee: one(employees, { fields: [employmentPeriods.employeeId], references: [employees.id] }),
  branch: one(branches, { fields: [employmentPeriods.branchId], references: [branches.id] }),
  department: one(departments, {
    fields: [employmentPeriods.departmentId],
    references: [departments.id],
  }),
  position: one(positions, { fields: [employmentPeriods.positionId], references: [positions.id] }),
}));

export const workforceDocumentsRelations = relations(workforceDocuments, ({ one }) => ({
  person: one(people, { fields: [workforceDocuments.personId], references: [people.id] }),
  cosigner: one(cosigners, { fields: [workforceDocuments.cosignerId], references: [cosigners.id] }),
}));
