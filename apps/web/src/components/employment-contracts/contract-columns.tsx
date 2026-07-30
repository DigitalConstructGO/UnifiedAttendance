import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { EmploymentContractRow } from "@/lib/api";
import { CONTRACT_STATUS_META } from "@/lib/workforce-presentation";

/** Two-line cell: a bold primary value above a muted secondary line. */
function Stacked({ primary, secondary }: { primary: string; secondary: string }) {
  return (
    <span>
      <span className="text-strong block font-bold">{primary}</span>
      <span className="block text-[0.6875rem] font-normal text-muted-foreground">{secondary}</span>
    </span>
  );
}

export function contractColumns({
  manageable,
  busy,
  onEdit,
  onDelete,
}: {
  manageable: boolean;
  busy: boolean;
  onEdit: (row: EmploymentContractRow) => void;
  onDelete: (row: EmploymentContractRow) => void;
}): ColumnDef<EmploymentContractRow>[] {
  return [
    {
      id: "contract",
      accessorFn: (row) => `${row.contract.contractNumber} ${row.contract.notes ?? ""}`,
      header: "Contract",
      cell: ({ row }) => (
        <Stacked
          primary={row.original.contract.contractNumber}
          secondary={
            row.original.contract.signedOn
              ? `Signed ${row.original.contract.signedOn}`
              : "Not signed"
          }
        />
      ),
    },
    {
      id: "employee",
      accessorFn: (row) =>
        `${row.person.firstName} ${row.person.lastName} ${row.employee.employeeCode}`,
      header: "Employee",
      cell: ({ row }) => (
        <Stacked
          primary={`${row.original.person.firstName} ${row.original.person.lastName}`}
          secondary={row.original.employee.employeeCode}
        />
      ),
    },
    {
      id: "assignment",
      accessorFn: (row) =>
        `${row.department?.name ?? ""} ${row.position?.title ?? ""} ${row.period.employmentType}`,
      header: "Assignment",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.department?.name ?? "No department"}
          <span className="block text-[0.6875rem]">
            {row.original.position?.title ?? "No position"}
          </span>
        </span>
      ),
    },
    {
      id: "dates",
      accessorFn: (row) => `${row.contract.startsOn} ${row.contract.endsOn ?? "open"}`,
      header: "Contract dates",
      cell: ({ row }) => (
        <span className="font-numeric text-muted-foreground">
          {row.original.contract.startsOn}
          <span className="block text-[0.6875rem]">
            to {row.original.contract.endsOn ?? "Open ended"}
          </span>
        </span>
      ),
    },
    {
      id: "cosigner",
      accessorFn: (row) =>
        `${row.cosigner.fullName} ${row.cosigner.phone ?? ""} ${row.cosigner.workplace ?? ""}`,
      header: "Cosigner",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.cosigner.fullName}
          <span className="block text-[0.6875rem]">
            {row.original.cosigner.workplace ?? "No workplace"}
          </span>
        </span>
      ),
    },
    {
      accessorKey: "contract.status",
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const meta = CONTRACT_STATUS_META[row.original.contract.status];
        return (
          <span className={`rounded-md px-2.5 py-1 text-[0.6875rem] font-bold ${meta.badgeClass}`}>
            {meta.label}
          </span>
        );
      },
    },
    ...(manageable
      ? [
          {
            id: "actions",
            header: "Actions",
            enableGlobalFilter: false,
            cell: ({ row }: { row: { original: EmploymentContractRow } }) => (
              <span className="flex items-center gap-1">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Edit contract ${row.original.contract.contractNumber}`}
                  onClick={() => onEdit(row.original)}
                >
                  <Pencil aria-hidden="true" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  disabled={busy}
                  className="text-destructive hover:text-destructive"
                  aria-label={`Delete contract ${row.original.contract.contractNumber}`}
                  onClick={() => onDelete(row.original)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </span>
            ),
          } satisfies ColumnDef<EmploymentContractRow>,
        ]
      : []),
  ];
}
