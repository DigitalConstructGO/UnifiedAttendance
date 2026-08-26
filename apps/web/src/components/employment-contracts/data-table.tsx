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
  // The table instance keeps one identity for its whole life, so the React Compiler
  // would cache everything read off it and never show rows that arrive later.
  "use no memo";
  const firstHeaderGroup = table.getHeaderGroups()[0];
  const detailValueClassName = cellClassName || "text-strong font-semibold";

  return (
    <>
      <ul className="sm:hidden">
        {table.getRowModel().rows.map((row) => {
          const cells = row.getVisibleCells();
          const titleCell = cells[0];
          const actionsCell = cells.find((cell) => cell.column.id === "actions");
          const detailCells = cells.filter((cell) => cell !== titleCell && cell !== actionsCell);
          return (
            <li key={row.id} className="border-b border-border px-5 py-4 last:border-b-0">
              <div className="flex items-start justify-between gap-3">
                <div className={`min-w-0 flex-1 text-sm ${cellClassName}`}>
                  {flexRender(titleCell.column.columnDef.cell, titleCell.getContext())}
                </div>
                {actionsCell ? (
                  <div className="shrink-0">
                    {flexRender(actionsCell.column.columnDef.cell, actionsCell.getContext())}
                  </div>
                ) : null}
              </div>
              {detailCells.length > 0 ? (
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 rounded-[11px] bg-[var(--surface-subtle)] px-3 py-2.5 text-[0.6875rem]">
                  {detailCells.map((cell) => {
                    const header = firstHeaderGroup?.headers.find((h) => h.id === cell.column.id);
                    return (
                      <div key={cell.id} className="min-w-0">
                        <dt className="text-muted-foreground">
                          {header && !header.isPlaceholder
                            ? flexRender(header.column.columnDef.header, header.getContext())
                            : null}
                        </dt>
                        <dd className={`mt-0.5 truncate ${detailValueClassName}`}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              ) : null}
            </li>
          );
        })}
      </ul>
      <div className="hidden overflow-x-auto sm:block">
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
    </>
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
  "use no memo";
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
