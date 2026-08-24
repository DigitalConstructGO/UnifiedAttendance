import { runLateArrivalScan } from "@UnifiedAttendance/api";
import { cronRoute } from "@/lib/cron";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const GET = cronRoute("late-arrival-scan", runLateArrivalScan);
