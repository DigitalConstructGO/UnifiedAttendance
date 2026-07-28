import { db } from "@UnifiedAttendance/db";
import { sql } from "drizzle-orm";

export async function resetDatabase() {
  await db.execute(sql.raw(`truncate table ${await tableList()} restart identity cascade`));
}

let cachedTableList: string | undefined;

async function tableList() {
  if (cachedTableList) return cachedTableList;

  const { rows } = await db.execute<{ table_name: string }>(sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
  `);
  if (rows.length === 0) {
    throw new Error("The test database has no tables — did the migrations in test/setup.ts run?");
  }

  cachedTableList = rows.map((row) => `"public"."${row.table_name}"`).join(", ");
  return cachedTableList;
}
