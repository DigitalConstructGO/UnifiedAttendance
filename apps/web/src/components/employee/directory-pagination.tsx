import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

import { pageOptions } from "./directory-model";

export function DirectoryPagination({
  shown,
  total,
  currentPage,
  totalPages,
  onPageChange,
}: {
  shown: number;
  total: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <footer className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
      <p className="text-xs text-muted-foreground">
        Showing {shown} of {total} employees
      </p>
      {totalPages > 1 ? (
        <div className="flex items-center gap-1" aria-label="Employee directory pages">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous page"
            disabled={currentPage === 1}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          {pageOptions(currentPage, totalPages).map((option) => (
            <Button
              key={option}
              variant={option === currentPage ? "default" : "outline"}
              size="icon-sm"
              aria-label={`Page ${option}`}
              aria-current={option === currentPage ? "page" : undefined}
              onClick={() => onPageChange(option)}
            >
              {option}
            </Button>
          ))}
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next page"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      ) : null}
    </footer>
  );
}
