import { TriangleAlert } from "lucide-react";
import { useMarketStatusStore } from "@/stores/marketStatus.store";
import type { PortfolioValuation } from "@/types/portfolio";
import { buildValuationNotices } from "../valuationNotice";

/** Warns when portfolio figures are incomplete (a price is missing) or based on stale market data. */
export function ValuationNotice({ valuation }: { valuation: PortfolioValuation | undefined }) {
  const status = useMarketStatusStore((state) => state.status);
  const updatedAt = useMarketStatusStore((state) => state.updatedAt);
  const notices = buildValuationNotices(valuation, { status, updatedAt });

  if (notices.length === 0) return null;

  return (
    <div role="status" className="space-y-1 rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-ink-muted">
      {notices.map((notice) => (
        <p key={notice.id} className="flex items-start gap-2">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-loss" aria-hidden="true" />
          <span>{notice.message}</span>
        </p>
      ))}
    </div>
  );
}
