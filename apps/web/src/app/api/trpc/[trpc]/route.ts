import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createContext } from "@UnifiedAttendance/api/context";
import { appRouter } from "@UnifiedAttendance/api/routers/index";
import { NextRequest } from "next/server";

function handler(req: NextRequest) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
  });
}
export { handler as GET, handler as POST };
