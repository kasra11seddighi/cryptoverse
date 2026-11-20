import { useId } from "react";
import { Search, X } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
}

export function SearchInput({ value, onChange, label, placeholder }: SearchInputProps) {
  const inputId = useId();

  return (
    <div className="relative w-full">
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
        aria-hidden="true"
      />
      <input
        id={inputId}
        type="search"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-line bg-canvas pl-9 pr-9 text-sm text-ink placeholder:text-ink-muted/70 focus:border-cyan/60 focus:outline-2 focus:outline-offset-0 focus:outline-cyan/30 [&::-webkit-search-cancel-button]:hidden"
      />
      {value !== "" && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-cyan"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
