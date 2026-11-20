import { useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  trailing?: ReactNode;
}

export function TextField({ label, error, trailing, id, ...props }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`h-10 w-full rounded-lg border bg-canvas px-3 text-sm text-ink placeholder:text-ink-muted/70 focus:outline-2 focus:outline-offset-0 focus:outline-cyan ${trailing ? "pr-10" : ""} ${error ? "border-loss" : "border-line"}`}
          {...props}
        />
        {trailing && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-1.5">{trailing}</div>
        )}
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-loss">
          {error}
        </p>
      )}
    </div>
  );
}
