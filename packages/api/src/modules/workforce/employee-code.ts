import { eq, sql } from "drizzle-orm";

import {
  branches,
  departments,
  employees,
  organizations,
} from "@UnifiedAttendance/db/schema/index";

import { badRequest } from "../../errors";

import type { Context } from "../../context";

/** Uppercase letters and digits only, so the ID survives being typed and printed. */
function normalize(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Departments have no code of their own, so three letters of the name stand in. */
function departmentSegment(name: string) {
  return normalize(name).slice(0, 3);
}

/**
 * Employee IDs are read straight off the org chart: organization code, branch
 * code, department, then a running number — DCG-HQ-SOF-0007. An employee
 * without a department simply skips that segment, and the number runs per
 * prefix so each department numbers its own people.
 */
export async function nextEmployeeCode(
  ctx: Context,
  branchId: string,
  departmentId: string | null,
) {
  const [organization] = await ctx.db
    .select({ code: organizations.code })
    .from(organizations)
    .limit(1);
  const [branch] = await ctx.db
    .select({ code: branches.code })
    .from(branches)
    .where(eq(branches.id, branchId))
    .limit(1);
  if (!branch) badRequest("Unknown branch");
  const [department] = departmentId
    ? await ctx.db
        .select({ name: departments.name })
        .from(departments)
        .where(eq(departments.id, departmentId))
        .limit(1)
    : [undefined];

  const prefix = [
    organization ? normalize(organization.code) : "",
    normalize(branch.code),
    department ? departmentSegment(department.name) : "",
  ]
    .filter(Boolean)
    .join("-");

  // Anchored on both sides, so DCG-HQ never counts DCG-HQ-SOF numbers.
  const { rows } = await ctx.db.execute<{ next: number }>(sql`
    select coalesce(max(substring(${employees.employeeCode} from '[0-9]+$')::int), 0) + 1 as next
    from ${employees}
    where ${employees.employeeCode} ~ ${`^${prefix}-[0-9]+$`}
  `);
  const next = rows[0]?.next ?? 1;
  return `${prefix}-${String(next).padStart(4, "0")}`;
}

/** True when an insert lost the race for a code that was free moments ago. */
export function isDuplicateEmployeeCode(error: unknown) {
  for (let cause = error; cause; cause = (cause as { cause?: unknown }).cause) {
    const candidate = cause as { code?: string; constraint?: string };
    if (
      candidate.code === "23505" &&
      String(candidate.constraint ?? "").includes("employee_code")
    ) {
      return true;
    }
  }
  return false;
}
