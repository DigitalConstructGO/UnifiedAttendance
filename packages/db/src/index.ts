import { env } from "@UnifiedAttendance/env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema/index";


const pool = new Pool({
  connectionString: env.DATABASE_URL,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  query_timeout: 30_000,
  keepAlive: true,
  allowExitOnIdle: true,
});

pool.on("error", (error) => {
  console.error(`[db] idle connection dropped, discarded from the pool: ${error.message}`);
});

export const db = drizzle(pool, { schema });

export type Database = typeof db;

export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export type DatabaseHandle = Omit<Database, "$client">;
