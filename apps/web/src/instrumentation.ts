import { runAbsenceScan, runLateArrivalScan } from "@UnifiedAttendance/api";
import { createInnerContext } from "@UnifiedAttendance/api/context";

let registered = false;

const RETRY_DELAY_MS = 5_000;


async function runWithRetry(label: string, run: () => Promise<unknown>) {
  try {
    console.log(`[${label}]`, await run());
  } catch (error) {
    console.error(`[${label}] run failed, retrying once:`, error);
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    try {
      console.log(`[${label}]`, await run());
    } catch (retryError) {
      console.error(`[${label}] retry failed:`, retryError);
    }
  }
}


export async function register() {

  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (registered) return;
  registered = true;

  const { schedule } = await import("node-cron");

  schedule(
    "*/5 * * * *",
    () =>
      runWithRetry("late-arrival-scan", () =>
        runLateArrivalScan(createInnerContext({ session: null })),
      ),
    { name: "late-arrival-scan", noOverlap: true },
  );

  schedule(
    "*/15 * * * *",
    () => runWithRetry("absence-scan", () => runAbsenceScan(createInnerContext({ session: null }))),
    { name: "absence-scan", noOverlap: true },
  );
}
