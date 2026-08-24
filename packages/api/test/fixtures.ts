import { sqliteClient } from "@UnifiedAttendance/db";

import { seedRbac } from "../scripts/seed";
import { createInnerContext, type Context } from "../src/context";
import { seedDefaultNotificationTiers } from "../src/modules/notifications/service";
import { forgetBranches } from "../src/modules/reports/expected-days";
import { forgetGrantedPermissions } from "../src/modules/shared/guards";

export function testContext(userId?: string): Context {
  return createInnerContext({
    session: (userId ? { user: { id: userId } } : null) as Context["session"],
  });
}

export async function resetDatabase() {
  const tables = await tableList();
  await sqliteClient.executeMultiple(
    [
      "PRAGMA foreign_keys = OFF",
      ...tables.map((table) => `delete from "${table}"`),
      "PRAGMA foreign_keys = ON",
    ].join(";\n"),
  );
  await seedRbac();
  await seedDefaultNotificationTiers();
  forgetGrantedPermissions();
  forgetBranches();
}

let cachedTableList: string[] | undefined;

async function tableList() {
  if (cachedTableList) return cachedTableList;

  const { rows } = await sqliteClient.execute(
    `select name from sqlite_master
      where type = 'table' and name not like 'sqlite_%' and name <> '__drizzle_migrations'`,
  );
  if (rows.length === 0) {
    throw new Error("The test database has no tables — did the migrations in test/setup.ts run?");
  }

  cachedTableList = rows.map((row) => String(row.name));
  return cachedTableList;
}
