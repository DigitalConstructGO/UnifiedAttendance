import { redirect } from "next/navigation";

export default async function WorkforcePage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const requestedSection = (await searchParams).section;
  redirect(
    requestedSection
      ? `/dashboard/employees?section=${encodeURIComponent(requestedSection)}`
      : "/dashboard/employees",
  );
}
