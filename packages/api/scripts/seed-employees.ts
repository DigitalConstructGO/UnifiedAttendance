import { fileURLToPath } from "node:url";

import { eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import {
  branches,
  departments,
  employees,
  employmentPeriods,
  organizations,
  people,
  positions,
} from "@UnifiedAttendance/db/schema/index";

/**
 * Demo workforce data, run by hand:
 * `pnpm --filter @UnifiedAttendance/api employees:seed`.
 *
 * Idempotent by natural key — employee code, department name, position title —
 * so a second run tops up what is missing instead of duplicating. The client
 * seed depends on this one, since every client needs an account owner and every
 * project needs a manager.
 */

const DEPARTMENTS = ["Sales", "Delivery", "Finance", "Operations"];
const POSITIONS = [
  { title: "Account manager", description: "Owns client relationships." },
  { title: "Project manager", description: "Runs delivery for client projects." },
  { title: "Accountant", description: "Invoicing and collections." },
  { title: "Field technician", description: "On-site installation and support." },
];

const STAFF = [
  {
    code: "EMP-0001",
    firstName: "Bethlehem",
    lastName: "Assefa",
    gender: "female" as const,
    phone: "+251 911 100 001",
    email: "bethlehem.assefa@example.et",
    department: "Sales",
    position: "Account manager",
    hireDate: "2023-09-11",
  },
  {
    code: "EMP-0002",
    firstName: "Sara",
    lastName: "Tesfaye",
    gender: "female" as const,
    phone: "+251 911 100 002",
    email: "sara.tesfaye@example.et",
    department: "Finance",
    position: "Accountant",
    hireDate: "2023-11-02",
  },
  {
    code: "EMP-0003",
    firstName: "Selam",
    lastName: "Fikru",
    gender: "female" as const,
    phone: "+251 911 100 003",
    email: "selam.fikru@example.et",
    department: "Delivery",
    position: "Project manager",
    hireDate: "2024-01-15",
  },
  {
    code: "EMP-0004",
    firstName: "Dawit",
    lastName: "Haile",
    gender: "male" as const,
    phone: "+251 911 100 004",
    email: "dawit.haile@example.et",
    department: "Operations",
    position: "Field technician",
    hireDate: "2024-04-08",
  },
];

export async function seedEmployees() {
  const [organization] = await db.select().from(organizations).limit(1);
  if (!organization) throw new Error("Run the organization setup before seeding employees");

  const [branch] = await db.select().from(branches).limit(1);
  if (!branch) throw new Error("The organization has no branch to attach employees to");

  for (const name of DEPARTMENTS) {
    const [existing] = await db
      .select({ id: departments.id })
      .from(departments)
      .where(eq(departments.name, name))
      .limit(1);
    if (!existing) await db.insert(departments).values({ name, branchId: branch.id });
  }
  const departmentId = new Map(
    (await db.select({ id: departments.id, name: departments.name }).from(departments)).map(
      (row) => [row.name, row.id],
    ),
  );

  for (const position of POSITIONS) {
    const [existing] = await db
      .select({ id: positions.id })
      .from(positions)
      .where(eq(positions.title, position.title))
      .limit(1);
    if (!existing) await db.insert(positions).values(position);
  }
  const positionId = new Map(
    (await db.select({ id: positions.id, title: positions.title }).from(positions)).map((row) => [
      row.title,
      row.id,
    ]),
  );

  let created = 0;
  for (const member of STAFF) {
    const [existing] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.employeeCode, member.code))
      .limit(1);
    if (existing) continue;

    const [person] = await db
      .insert(people)
      .values({
        firstName: member.firstName,
        lastName: member.lastName,
        gender: member.gender,
        phone: member.phone,
        email: member.email,
      })
      .returning({ id: people.id });

    const [employee] = await db
      .insert(employees)
      .values({
        personId: person!.id,
        branchId: branch.id,
        departmentId: departmentId.get(member.department) ?? null,
        positionId: positionId.get(member.position) ?? null,
        employeeCode: member.code,
        employmentType: "permanent",
        hireDate: member.hireDate,
        status: "active",
      })
      .returning({ id: employees.id });

    // The open period is what the directory and attendance register read from.
    await db.insert(employmentPeriods).values({
      employeeId: employee!.id,
      branchId: branch.id,
      departmentId: departmentId.get(member.department) ?? null,
      positionId: positionId.get(member.position) ?? null,
      employmentType: "permanent",
      status: "active",
      effectiveFrom: member.hireDate,
    });
    created += 1;
  }

  const total = await db.select({ id: employees.id }).from(employees);
  console.log(`Seeded workforce demo data. Created ${created}; employees now: ${total.length}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await seedEmployees();
}
