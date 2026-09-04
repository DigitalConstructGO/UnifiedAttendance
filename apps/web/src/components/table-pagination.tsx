import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

/** A three-wide window of page numbers around the current one, 1-indexed. */
function pageOptions(current: number, total: number) {
  if (total <= 3) return Array.from({ length: total }, (_, index) => index + 1);
  if (current <= 2) return [1, 2, 3];
  if (current >= total - 1) return [total - 2, total - 1, total];
  return [current - 1, current, current + 1];
}

export function TablePagination({
  noun,
  shown,
  total,
  page,
  pageCount,
  pageSize,
  onPageChange,
}: {
  noun: string;
  shown: number;
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const current = page + 1;
  const pageStart = page * pageSize;

  return (
    <footer className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
      <p className="text-xs text-muted-foreground">
        Showing {pageStart + 1}–{pageStart + shown} of {total} {noun}
      </p>
      {pageCount > 1 ? (
        <div className="flex items-center gap-1" aria-label="Pages">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous page"
            disabled={page === 0}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          {pageOptions(current, pageCount).map((option) => (
            <Button
              key={option}
              variant={option === current ? "default" : "outline"}
              size="icon-sm"
              aria-label={`Page ${option}`}
              aria-current={option === current ? "page" : undefined}
              onClick={() => onPageChange(option - 1)}
            >
              {option}
            </Button>
          ))}
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next page"
            disabled={page >= pageCount - 1}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      ) : null}
    </footer>
  );
}
