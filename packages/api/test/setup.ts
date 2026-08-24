import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../db/src/migrations", import.meta.url));

let directory: string | undefined;

export async function setup() {
  directory = mkdtempSync(join(tmpdir(), "unified-attendance-test-"));
  const file = join(directory, "test.db");
  process.env.DATABASE_URL = `file:${file}`;

  const client = createClient({ url: `file:${file}` });
  try {
    await migrate(drizzle(client), { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    client.close();
  }
}

export async function teardown() {
  if (directory) rmSync(directory, { recursive: true, force: true });
  directory = undefined;
}
