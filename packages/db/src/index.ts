import { AsyncLocalStorage } from "node:async_hooks";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { env } from "@UnifiedAttendance/env/server";
import { createClient, type Client, type InValue, type ResultSet } from "@libsql/client";
import type { SQL } from "drizzle-orm";
import { SQLiteAsyncDialect } from "drizzle-orm/sqlite-core";
import { drizzle, type SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";

import * as schema from "./schema/index";

/**
 * DATABASE_URL is a libsql URL: `file:/absolute/path/app.db` for a local
 * SQLite file, or `libsql://…` (with `DATABASE_AUTH_TOKEN`) for a hosted Turso
 * database.
 *
 * The engine is `@libsql/client`. It is driven through Drizzle's `sqlite-proxy`
 * driver rather than `drizzle-orm/libsql` because of how the file client
 * behaves inside one Node process: statements execute synchronously on the JS
 * thread, and a second connection that finds the file write-locked spins in
 * SQLite's busy wait — blocking the event loop, so the transaction holding the
 * lock can never reach its `commit`. Every request would wait out the busy
 * timeout and then fail with SQLITE_BUSY.
 *
 * Routing every statement through one callback lets this module serialise
 * access itself, asynchronously:
 *   - `db.transaction()` holds a process-wide mutex for the life of the
 *     transaction (async callbacks included — nothing commits early);
 *   - statements outside a transaction take the mutex per statement, so they
 *     queue behind an open transaction instead of spinning or failing;
 *   - statements issued from *inside* the transaction's async context bypass
 *     the mutex (they already own it), tracked with AsyncLocalStorage.
 */
if (env.DATABASE_URL.startsWith("file:")) {
  const path = env.DATABASE_URL.slice("file:".length);
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
}

const client = createClient({
  url: env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
  // SQLite busy_timeout in ms — only reached by *other* processes on the file.
  timeout: 5000,
});

// Connection tuning. This module funnels every statement through ONE libsql
// connection (see above), so per-connection pragmas set here stay in force.
for (const pragma of [
  "journal_mode = WAL", // readers never block the writer
  "synchronous = NORMAL", // safe with WAL; fsync on checkpoint, not every commit
  "cache_size = -64000", // 64 MB page cache
  "temp_store = MEMORY",
  "mmap_size = 268435456", // 256 MB memory-mapped reads
  "busy_timeout = 5000",
  "foreign_keys = ON",
  "wal_autocheckpoint = 1000",
  "optimize", // refresh planner statistics on startup
]) {
  await client.execute(`PRAGMA ${pragma}`);
}

class Mutex {
  private tail: Promise<void> = Promise.resolve();

  runExclusive<T>(work: () => Promise<T> | T): Promise<T> {
    const run = this.tail.then(work);
    this.tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}

const mutex = new Mutex();
const transactionContext = new AsyncLocalStorage<true>();

/** Run `work` now if this async context owns the transaction, else queue it. */
function serialised<T>(work: () => Promise<T>): Promise<T> {
  return transactionContext.getStore() ? work() : mutex.runExclusive(work);
}

/**
 * libsql binds numbers, strings, bigints, buffers, booleans and null. Values
 * Drizzle has already mapped through a column (a `timestamp_ms` Date → ms)
 * arrive as numbers; anything else reaching here came from a free-form
 * `sql\`${value}\`` fragment and is mapped the same way the columns would.
 */
function bindable(value: unknown): InValue {
  if (value === undefined) return null;
  if (value instanceof Date) return value.getTime();
  if (value !== null && typeof value === "object" && !Buffer.isBuffer(value)) {
    return JSON.stringify(value);
  }
  return value as InValue;
}

function execute(sql: string, params: unknown[]): Promise<ResultSet> {
  return client.execute({ sql, args: params.map(bindable) });
}

const base = drizzle(
  async (sql, params, method) => {
    const result = await serialised(() => execute(sql, params));
    const rows = result.rows.map((row) =>
      Array.from({ length: result.columns.length }, (_, index) => row[index]),
    );
    if (method === "get") return { rows: rows[0] ?? [] };
    return { rows };
  },
  { schema },
);

const innerTransaction = base.transaction.bind(base);
base.transaction = ((work, config) =>
  mutex.runExclusive(() =>
    transactionContext.run(true, () => innerTransaction(work, config)),
  )) as typeof base.transaction;

export const db: SqliteRemoteDatabase<typeof schema> = base;

/** The raw libsql client, for migrations and test maintenance only. */
export const sqliteClient: Client = client;

export type Database = typeof db;

export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export type DatabaseHandle = Omit<Database, "$client" | "batch">;

const dialect = new SQLiteAsyncDialect();

/**
 * Run a hand-written query and get its rows back as objects keyed by column
 * name — the SQLite counterpart of Postgres' `db.execute(sql\`…\`).rows`.
 * Runs on the one shared connection, so it takes part in whatever transaction
 * the calling async context has open and otherwise queues behind one; the
 * `handle` argument documents intent and keeps call sites honest.
 */
export async function rawAll<T extends Record<string, unknown>>(
  _handle: DatabaseHandle,
  query: SQL,
): Promise<T[]> {
  const { sql, params } = dialect.sqlToQuery(query);
  const result = await serialised(() => execute(sql, params));
  return result.rows.map(
    (row) => Object.fromEntries(result.columns.map((column, index) => [column, row[index]])) as T,
  );
}

export async function rawGet<T extends Record<string, unknown>>(
  handle: DatabaseHandle,
  query: SQL,
): Promise<T | undefined> {
  return (await rawAll<T>(handle, query))[0];
}
