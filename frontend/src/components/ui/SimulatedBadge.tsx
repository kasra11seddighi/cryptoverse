import { FlaskConical } from "lucide-react";

/** Reminder that the portfolio is simulated. Market prices are live; balances and trades are not real. */
export function SimulatedBadge() {
  return (
    <span
      title="Your balance, holdings and trades are simulated; no real money is involved. Market prices are live from CoinGecko."
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-ink-muted"
    >
      <FlaskConical className="size-3.5 text-cyan" aria-hidden="true" />
      Simulated portfolio
    </span>
  );
}
