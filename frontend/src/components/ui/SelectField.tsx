import { useId } from "react";
import type { SelectHTMLAttributes } from "react";

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: ReadonlyArray<{ value: string; label: string; disabled?: boolean }>;
}

export function SelectField({ label, options, id, ...props }: SelectFieldProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div>
      <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <select
        id={selectId}
        className="h-10 w-full rounded-lg border border-line bg-canvas px-3 text-sm text-ink focus:border-cyan/60 focus:outline-2 focus:outline-cyan/30 disabled:cursor-not-allowed disabled:opacity-60"
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
