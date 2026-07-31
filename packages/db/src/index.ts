import { env } from "@UnifiedAttendance/env/server";
import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "./schema/index";

export const db = drizzle(env.DATABASE_URL, { schema });

export type Database = typeof db;

/** The handle drizzle hands to a `transaction` callback. */
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * What a query may run against: the pool or an open transaction. `PgTransaction`
 * extends `PgDatabase`, so callers that accept this work either way and never
 * need to know which one they were given.
 */
export type DatabaseHandle = Omit<Database, "$client">;
