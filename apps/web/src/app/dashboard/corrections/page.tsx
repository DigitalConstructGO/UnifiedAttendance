import { redirect } from "next/navigation";

export default function CorrectionsPage() {
  redirect("/dashboard/attendance?section=corrections");
}
