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

/**
 * Required, not defensive. node-postgres emits `error` on the pool when a connection
 * dies while sitting idle, and an `error` event with no listener is thrown — which
 * takes the process down. Holding connections open instead of reaping them makes that
 * routine rather than rare: poolers recycle, NAT tables forget idle sockets, and the
 * test container is torn down while the pool is still holding one.
 *
 * There is nothing to recover here. The pool has already discarded the dead client and
 * will open a fresh one on the next query, so this only needs to stop the throw and
 * leave a trace.
 */
pool.on("error", (error) => {
  console.error(`[db] idle connection dropped, discarded from the pool: ${error.message}`);
});

export const db = drizzle(pool, { schema });

export type Database = typeof db;

export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export type DatabaseHandle = Omit<Database, "$client">;
