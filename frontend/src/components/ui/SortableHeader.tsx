import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { Sort } from "@/types/common";

interface SortableHeaderProps<K extends string> {
  label: string;
  sortKey: K;
  sort?: Sort<K>;
  onSortChange?: (key: K) => void;
  align?: "left" | "right";
  className?: string;
}

/** Table header cell. Sortable (a real button with aria-sort) when onSortChange is given, plain otherwise. */
export function SortableHeader<K extends string>({
  label,
  sortKey,
  sort,
  onSortChange,
  align = "left",
  className = "",
}: SortableHeaderProps<K>) {
  const direction = sort?.key === sortKey ? sort.direction : null;
  const active = direction !== null;
  const ariaSort = direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none";
  const alignment = align === "right" ? "justify-end text-right" : "justify-start text-left";
  const padding = className.includes("pl-") ? "" : "px-4";

  if (!onSortChange) {
    return (
      <th scope="col" className={`${padding} py-3 font-medium ${align === "right" ? "text-right" : "text-left"} ${className}`}>
        {label}
      </th>
    );
  }

  const Icon = direction === "asc" ? ArrowUp : direction === "desc" ? ArrowDown : ChevronsUpDown;

  return (
    <th scope="col" aria-sort={ariaSort} className={`${padding} py-1 font-medium ${className}`}>
      <button
        type="button"
        onClick={() => onSortChange(sortKey)}
        className={`flex w-full items-center gap-1 rounded-md py-2 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-cyan ${alignment} ${active ? "text-ink" : ""}`}
      >
        {label}
        <Icon className={`size-3.5 ${active ? "text-cyan" : "opacity-60"}`} aria-hidden="true" />
      </button>
    </th>
  );
}
