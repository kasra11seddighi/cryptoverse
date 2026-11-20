interface RangeSelectorProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  getLabel?: (option: T) => string;
}

/** Segmented time-range control. Plain buttons with aria-pressed, so it works with Tab and Enter/Space. */
export function RangeSelector<T extends string>({
  options,
  value,
  onChange,
  label,
  getLabel = (option) => option,
}: RangeSelectorProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex rounded-lg border border-line bg-canvas p-0.5"
    >
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option)}
            className={`h-7 min-w-9 rounded-md px-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-cyan ${active ? "bg-surface-2 text-ink shadow-sm" : "text-ink-muted hover:text-ink"}`}
          >
            {getLabel(option)}
          </button>
        );
      })}
    </div>
  );
}
