import { auth } from "@UnifiedAttendance/auth";
import { db as defaultDb, type DatabaseHandle } from "@UnifiedAttendance/db";

type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

export function createInnerContext({
  session,
  db = defaultDb,
}: {
  session: Session;
  db?: DatabaseHandle;
}) {
  return {
    session,
    db,
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
