import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface StatePanelProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  tone?: "neutral" | "error";
  action?: ReactNode;
}

/** Shared layout for empty and error states. */
export function StatePanel({ icon: Icon, title, description, tone = "neutral", action }: StatePanelProps) {
  const isError = tone === "error";

  return (
    <div
      role={isError ? "alert" : "status"}
      className="flex h-full min-h-48 flex-col items-center justify-center px-4 py-10 text-center"
    >
      <span
        className={`flex size-11 items-center justify-center rounded-full ${isError ? "bg-loss/10 text-loss" : "bg-surface-2 text-ink-muted"}`}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <p className="mt-3 text-sm font-medium">{title}</p>
      {description && <p className="mt-1 max-w-xs text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
