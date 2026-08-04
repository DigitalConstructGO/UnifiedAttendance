import { redirect } from "next/navigation";

/**
 * Corrections moved under Attendance, next to the register whose days they
 * change. The old route stays as a redirect so bookmarks and the links that
 * were already handed out keep working.
 */
export default function CorrectionsPage() {
  redirect("/dashboard/attendance?section=corrections");
}
