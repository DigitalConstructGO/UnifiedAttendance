import { redirect } from "next/navigation";

export default async function DepartmentsPage() {
  redirect("/dashboard/employees?section=departments");
}
