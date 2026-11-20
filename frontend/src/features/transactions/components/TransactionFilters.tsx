import { SearchInput } from "@/components/ui/SearchInput";
import { SelectField } from "@/components/ui/SelectField";
import { Button } from "@/components/ui/Button";
import type { TradeSide, TransactionStatus } from "@/types/portfolio";
import type { TransactionFilters as Filters } from "../query";

interface TransactionFiltersProps {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  onClear: () => void;
  isFiltered: boolean;
}

const SIDE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "buy", label: "Buys" },
  { value: "sell", label: "Sells" },
] as const;

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
] as const;

export function TransactionFilters({ filters, onChange, onClear, isFiltered }: TransactionFiltersProps) {
  return (
    <div className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_10rem_10rem_auto] sm:items-end sm:px-5">
      <SearchInput
        label="Search transactions by coin name or symbol"
        placeholder="Search by coin"
        value={filters.search}
        onChange={(search) => onChange({ search })}
      />
      <SelectField
        label="Type"
        value={filters.side}
        onChange={(event) => onChange({ side: event.target.value as TradeSide | "all" })}
        options={SIDE_OPTIONS}
      />
      <SelectField
        label="Status"
        value={filters.status}
        onChange={(event) => onChange({ status: event.target.value as TransactionStatus | "all" })}
        options={STATUS_OPTIONS}
      />
      <Button variant="ghost" disabled={!isFiltered} onClick={onClear}>
        Clear filters
      </Button>
    </div>
  );
}
