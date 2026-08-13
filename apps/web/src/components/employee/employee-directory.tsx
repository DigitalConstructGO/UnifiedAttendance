import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { DirectoryEmployeeRow } from "@/lib/api";

import { DirectoryPagination } from "./directory-pagination";
import { DirectoryTable } from "./directory-table";
import { DirectoryToolbar, type StatusFilter } from "./directory-toolbar";
import { EMPLOYEE_DIRECTORY_PAGE_SIZE, employeeSearchIndex } from "./directory-model";
import { exportEmployees } from "./export-employees";

export function EmployeeDirectory({
  employees,
  manageable,
}: {
  employees: DirectoryEmployeeRow[];
  manageable: boolean;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);

  const visibleEmployees = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return employees.filter((row) => {
      const matchesSearch = !query || employeeSearchIndex(row).includes(query);
      return matchesSearch && (statusFilter === "all" || row.employee.status === statusFilter);
    });
  }, [employees, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(visibleEmployees.length / EMPLOYEE_DIRECTORY_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const currentEmployees = visibleEmployees.slice(
    (currentPage - 1) * EMPLOYEE_DIRECTORY_PAGE_SIZE,
    currentPage * EMPLOYEE_DIRECTORY_PAGE_SIZE,
  );

  return (
    <Card className="gap-0 rounded-[18px] py-0 shadow-[var(--shadow-card)] ring-border">
      <CardHeader className="border-b border-border px-4 py-4">
        <DirectoryToolbar
          search={search}
          statusFilter={statusFilter}
          manageable={manageable}
          exportDisabled={visibleEmployees.length === 0}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          onStatusChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
          onExport={() => exportEmployees(visibleEmployees)}
        />
      </CardHeader>
      <CardContent className="p-0">
        <DirectoryTable employees={currentEmployees} />
        <DirectoryPagination
          shown={currentEmployees.length}
          total={visibleEmployees.length}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </CardContent>
    </Card>
  );
}
