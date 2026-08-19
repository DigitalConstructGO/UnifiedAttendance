import { runAbsenceScan, runLateArrivalScan } from "@UnifiedAttendance/api";
import { createInnerContext } from "@UnifiedAttendance/api/context";


let registered = false;

/**
 * Schedules the late-arrival notification scan (`runLateArrivalScan`) every
 * 5 minutes. There is no incoming HTTP request here to build a `Context`
 */
export async function register() {
  // instrumentation.ts loads under every runtime Next.js supports,
  // including edge — node-cron (and the timers it relies on) only works
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (registered) return;
  registered = true;

  const { schedule } = await import("node-cron");

  schedule(
    "*/5 * * * *",
    async () => {
      try {
        const ctx = createInnerContext({ session: null });
        const summary = await runLateArrivalScan(ctx);
        console.log("[late-arrival-scan]", summary);
      } catch (error) {
        console.error("[late-arrival-scan] run failed:", error);
      }
    },
    { name: "late-arrival-scan", noOverlap: true },
  );

  schedule(
    "*/15 * * * *",
    async () => {
      try {
        const ctx = createInnerContext({ session: null });
        const summary = await runAbsenceScan(ctx);
        console.log("[absence-scan]", summary);
      } catch (error) {
        console.error("[absence-scan] run failed:", error);
      }
    },
    { name: "absence-scan", noOverlap: true },
  );
}
