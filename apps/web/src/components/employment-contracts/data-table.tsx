import { type Table, flexRender } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

export function DataTable<T>({
  table,
  minWidth,
  cellClassName = "",
}: {
  table: Table<T>;
  minWidth: string;
  cellClassName?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-xs" style={{ minWidth }}>
        <thead className="bg-[var(--surface-subtle)] text-[0.625rem] font-bold tracking-[0.06em] text-muted-foreground uppercase">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="px-4 py-3 first:pl-5">
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-t border-border hover:bg-muted/40">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className={`px-4 py-3 first:pl-5 ${cellClassName}`}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TableEmptyState({
  icon,
  title,
  hint,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <div className="grid min-h-48 place-items-center px-5 text-center">
      <div>
        {icon}
        <p className="text-strong mt-3 text-sm font-bold">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

export function TableFooter<T>({ table, itemLabel }: { table: Table<T>; itemLabel: string }) {
  return (
    <footer className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
      <p className="text-xs text-muted-foreground">
        Showing {table.getRowModel().rows.length} of {table.getFilteredRowModel().rows.length}{" "}
        {itemLabel}
      </p>
      {table.getPageCount() > 1 ? (
        <div className="flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="outline"
            aria-label="Previous page"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span className="px-2 text-xs font-semibold text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <Button
            size="icon-sm"
            variant="outline"
            aria-label="Next page"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      ) : null}
    </footer>
  );
}
