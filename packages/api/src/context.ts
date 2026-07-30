import { auth } from "@UnifiedAttendance/auth";

type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

export function createInnerContext({ session }: { session: Session }) {
  return {
    session,
  };
}

export async function createContext(req: Request) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });
  return createInnerContext({ session });
}

export type Context = ReturnType<typeof createInnerContext>;
