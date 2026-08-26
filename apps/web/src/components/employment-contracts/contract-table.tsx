import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { FileSignature, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { EmploymentContractRow } from "@/lib/api";
import { CONTRACT_STATUS_META } from "@/lib/workforce-presentation";

import { contractColumns } from "./contract-columns";
import { CONTRACT_STATUSES, CONTRACT_TABLE_PAGE_SIZE, type ContractStatus } from "./contract-model";
import { DataTable, TableEmptyState, TableFooter } from "./data-table";

export function ContractTable({
  contracts,
  manageable,
  busy,
  onEdit,
  onDelete,
}: {
  contracts: EmploymentContractRow[];
  manageable: boolean;
  busy: boolean;
  onEdit: (row: EmploymentContractRow) => void;
  onDelete: (row: EmploymentContractRow) => void;
}) {
  // The table instance keeps one identity for its whole life, so the React Compiler
  // would cache everything read off it and never show rows that arrive later.
  "use no memo";
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | ContractStatus>("all");

  const columns = useMemo(
    () => contractColumns({ manageable, busy, onEdit, onDelete }),
    [busy, manageable, onDelete, onEdit],
  );
  const table = useReactTable({
    data: contracts,
    columns,
    state: { globalFilter: search },
    onGlobalFilterChange: setSearch,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: CONTRACT_TABLE_PAGE_SIZE } },
  });

  function applyStatus(nextStatus: "all" | ContractStatus) {
    setStatus(nextStatus);
    table.getColumn("status")?.setFilterValue(nextStatus === "all" ? undefined : nextStatus);
    table.setPageIndex(0);
  }

  return (
    <Card className="gap-0 rounded-[18px] py-0 shadow-[var(--shadow-card)] ring-border">
      <CardHeader className="border-b border-border px-4 py-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search employment contracts</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                table.setPageIndex(0);
              }}
              className="h-10 rounded-[11px] bg-[var(--surface-subtle)] pr-3 pl-9"
              placeholder="Search contract, employee, assignment, or cosigner…"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {(["all", ...CONTRACT_STATUSES] as const).map((item) => (
              <Button
                key={item}
                size="sm"
                variant={status === item ? "default" : "outline"}
                className="h-8 rounded-[9px] px-3"
                onClick={() => applyStatus(item)}
              >
                {item === "all" ? "All" : CONTRACT_STATUS_META[item].label}
              </Button>
            ))}
            {manageable ? (
              <Button asChild size="sm" className="h-8 rounded-[9px] px-3">
                <Link href="/dashboard/employees?section=contracts&view=create">
                  <Plus aria-hidden="true" />
                  Create contract
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <DataTable table={table} minWidth="1080px" />
        {table.getRowModel().rows.length === 0 ? (
          <TableEmptyState
            icon={
              <FileSignature className="mx-auto size-7 text-muted-foreground" aria-hidden="true" />
            }
            title="No contracts found"
            hint="Create a contract or change the current search and status filter."
          />
        ) : null}
        <TableFooter table={table} itemLabel="contracts" />
      </CardContent>
    </Card>
  );
}
