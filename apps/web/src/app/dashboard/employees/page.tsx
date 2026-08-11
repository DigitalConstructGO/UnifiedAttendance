import { type EmployeeSection, EmployeeWorkspace } from "@/components/employee";
import type { EmploymentContractView } from "@/components/employment-contracts";
import { requireAccess } from "@/lib/access-server";

const employeeSections = new Set<EmployeeSection>([
  "employees",
  "create",
  "departments",
  "contracts",
  "archive",
]);
const contractViews = new Set<EmploymentContractView>(["list", "create", "cosigners"]);

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; view?: string; contractId?: string }>;
}) {
  await requireAccess("workforce:read");
  const params = await searchParams;
  const requestedSection = params.section;
  const section =
    requestedSection === "cosigners"
      ? "contracts"
      : employeeSections.has(requestedSection as EmployeeSection)
        ? (requestedSection as EmployeeSection)
        : "employees";
  const requestedView = requestedSection === "cosigners" ? "cosigners" : params.view;
  const contractView = contractViews.has(requestedView as EmploymentContractView)
    ? (requestedView as EmploymentContractView)
    : "list";

  return (
    <EmployeeWorkspace
      section={section}
      contractView={contractView}
      contractId={params.contractId}
    />
  );
}
