import { publicProcedure, router } from "../index";
import { accessRouter } from "./access";
import { attendanceRouter } from "./attendance";
import { correctionsRouter } from "./corrections";
import { devicesRouter } from "./devices";
import { organizationRouter } from "./organization";
import { workforceRouter } from "./workforce";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  access: accessRouter,
  organization: organizationRouter,
  workforce: workforceRouter,
  devices: devicesRouter,
  attendance: attendanceRouter,
  corrections: correctionsRouter,
});
export type AppRouter = typeof appRouter;
