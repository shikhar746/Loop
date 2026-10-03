"use client";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";

function pageWindow(page: number, totalPages: number): (number | "gap")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

/** Server-side pagination with "Showing 26–50 of 150". Links keep real hrefs; clicks use router.replace. */
export function Pager({
  page,
  pageSize,
  total,
  totalPages,
  hrefFor,
  onPageChange,
  noun = "items",
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hrefFor: (page: number) => string;
  onPageChange: (page: number) => void;
  noun?: string;
  className?: string;
}) {
  if (total === 0) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  const go = (p: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (p >= 1 && p <= totalPages && p !== page) onPageChange(p);
  };

  return (
    <div className={cn("flex flex-col items-center gap-3 sm:flex-row sm:justify-between", className)}>
      <p className="font-mono text-xs text-muted-foreground tabular" aria-live="polite">
        Showing {formatNumber(start)}–{formatNumber(end)} of {formatNumber(total)} {noun}
      </p>
      {totalPages > 1 && (
        <Pagination className="mx-0 w-auto">
          <PaginationContent className="flex-wrap justify-center">
            <PaginationItem>
              <PaginationPrevious
                href={hrefFor(Math.max(1, page - 1))}
                onClick={go(page - 1)}
                aria-disabled={page <= 1}
                className={cn(page <= 1 && "pointer-events-none opacity-40")}
              />
            </PaginationItem>
            {pageWindow(page, totalPages).map((p, i) =>
              p === "gap" ? (
                <PaginationItem key={`gap-${i}`} className="hidden sm:list-item">
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={p} className={cn(Math.abs(p - page) > 1 && p !== 1 && p !== totalPages && "hidden sm:list-item")}>
                  <PaginationLink
                    href={hrefFor(p)}
                    isActive={p === page}
                    onClick={go(p)}
                    className={cn("font-mono tabular", p === page && "border-primary/60 text-primary")}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <PaginationNext
                href={hrefFor(Math.min(totalPages, page + 1))}
                onClick={go(page + 1)}
                aria-disabled={page >= totalPages}
                className={cn(page >= totalPages && "pointer-events-none opacity-40")}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
