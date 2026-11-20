import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

type PageItem = number | "gap-start" | "gap-end";

function getPageItems(page: number, totalPages: number): PageItem[] {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const pages = [...new Set([1, page - 1, page, page + 1, totalPages])]
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((a, b) => a - b);

  const items: PageItem[] = [];
  pages.forEach((value, index) => {
    const previous = pages[index - 1];
    if (previous !== undefined && value - previous > 1) {
      items.push(index === 1 ? "gap-start" : "gap-end");
    }
    items.push(value);
  });
  return items;
}

const BUTTON =
  "flex size-8 items-center justify-center rounded-lg text-sm transition-colors focus-visible:outline-2 focus-visible:outline-cyan disabled:cursor-not-allowed disabled:opacity-40";

export function Pagination({ page, totalPages, total, pageSize, onPageChange, disabled = false }: PaginationProps) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5"
    >
      <p className="text-sm text-ink-muted" aria-live="polite">
        Showing <span className="text-ink">{start}</span>–<span className="text-ink">{end}</span> of{" "}
        <span className="text-ink">{total}</span>
      </p>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous page"
            disabled={disabled || page <= 1}
            onClick={() => onPageChange(page - 1)}
            className={`${BUTTON} text-ink-muted hover:bg-surface-2 hover:text-ink`}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>

          {getPageItems(page, totalPages).map((item) =>
            typeof item === "number" ? (
              <button
                key={item}
                type="button"
                aria-label={`Page ${item}`}
                aria-current={item === page ? "page" : undefined}
                disabled={disabled}
                onClick={() => onPageChange(item)}
                className={`${BUTTON} ${item === page ? "bg-accent/15 font-medium text-ink ring-1 ring-accent/40" : "text-ink-muted hover:bg-surface-2 hover:text-ink"}`}
              >
                {item}
              </button>
            ) : (
              <span key={item} aria-hidden="true" className="px-1 text-ink-muted">
                …
              </span>
            ),
          )}

          <button
            type="button"
            aria-label="Next page"
            disabled={disabled || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className={`${BUTTON} text-ink-muted hover:bg-surface-2 hover:text-ink`}
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </nav>
  );
}
