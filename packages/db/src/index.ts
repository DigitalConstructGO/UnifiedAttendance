import { env } from "@UnifiedAttendance/env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema/index";


const pool = new Pool({
  connectionString: env.DATABASE_URL,
  idleTimeoutMillis: 0,
  keepAlive: true,
  allowExitOnIdle: true,
});

export const db = drizzle(pool, { schema });

export type Database = typeof db;

export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export type DatabaseHandle = Omit<Database, "$client">;
