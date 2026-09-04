import { auth } from "@UnifiedAttendance/auth";
import { db as defaultDb, type DatabaseHandle } from "@UnifiedAttendance/db";

import { createMailer, type Mailer } from "./mailer";

type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

// Lazy: importing Context (which nearly every route/service/test does) must not require
// SMTP env vars to be present. `createMailer()` opens a real SMTP transport eagerly, so it
// is only built on first `send()` call, then cached and reused — this keeps SMTP config a
// hard dependency for the notification scans that actually send mail, not the whole app.
let cachedDefaultMailer: Mailer | undefined;
const defaultMailer: Mailer = {
  async send(input) {
    if (!cachedDefaultMailer) cachedDefaultMailer = createMailer();
    await cachedDefaultMailer.send(input);
  },
};

export function createInnerContext({
  session,
  db = defaultDb,
  mailer = defaultMailer,
}: {
  session: Session;
  db?: DatabaseHandle;
  mailer?: Mailer;
}) {
  return {
    session,
    db,
    mailer,
    grantedPermissions: undefined as Promise<string[]> | undefined,
  };
}

export async function createContext(req: Request) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });
  return createInnerContext({ session });
}

export type Context = ReturnType<typeof createInnerContext>;

export function withTransaction<T>(ctx: Context, work: (ctx: Context) => Promise<T>): Promise<T> {
  if (isTransaction(ctx.db)) return work(ctx);
  return ctx.db.transaction((tx) => work({ ...ctx, db: tx }));
}

function isTransaction(handle: DatabaseHandle) {
  return typeof (handle as { rollback?: unknown }).rollback === "function";
}
