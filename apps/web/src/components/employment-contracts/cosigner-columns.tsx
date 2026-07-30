import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Cosigner } from "@/lib/api";

export function cosignerColumns({
  manageable,
  busy,
  onEdit,
  onDelete,
}: {
  manageable: boolean;
  busy: boolean;
  onEdit: (cosigner: Cosigner) => void;
  onDelete: (cosigner: Cosigner) => void;
}): ColumnDef<Cosigner>[] {
  return [
    {
      accessorKey: "fullName",
      header: "Cosigner",
      cell: ({ row }) => <span className="text-strong font-bold">{row.original.fullName}</span>,
    },
    { accessorKey: "phone", header: "Phone", cell: ({ row }) => row.original.phone ?? "—" },
    {
      accessorKey: "workplace",
      header: "Workplace",
      cell: ({ row }) => row.original.workplace ?? "—",
    },
    {
      id: "createdAt",
      accessorFn: (row) => row.createdAt,
      header: "Added",
      cell: ({ row }) => String(row.original.createdAt).slice(0, 10),
    },
    ...(manageable
      ? [
          {
            id: "actions",
            header: "Actions",
            enableGlobalFilter: false,
            cell: ({ row }: { row: { original: Cosigner } }) => (
              <span className="flex items-center gap-1">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Edit ${row.original.fullName}`}
                  onClick={() => onEdit(row.original)}
                >
                  <Pencil aria-hidden="true" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  disabled={busy}
                  className="text-destructive hover:text-destructive"
                  aria-label={`Delete ${row.original.fullName}`}
                  onClick={() => onDelete(row.original)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </span>
            ),
          } satisfies ColumnDef<Cosigner>,
        ]
      : []),
  ];
}
