import { Activity } from "lucide-react";

interface BrandProps {
  /** Classes controlling when the wordmark is visible (hidden in the collapsed rail). */
  textClassName?: string;
}

export function Brand({ textClassName = "inline" }: BrandProps) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-cyan ring-1 ring-accent/30">
        <Activity className="size-5" aria-hidden="true" />
      </span>
      <span className={`text-lg font-semibold tracking-tight ${textClassName}`}>CryptoVerse</span>
    </div>
  );
}
