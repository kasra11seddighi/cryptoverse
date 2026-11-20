import { useMarketStatusStore } from "@/stores/marketStatus.store";
import type { MarketFeedStatus } from "@/stores/marketStatus.store";

const PRESENTATION: Record<MarketFeedStatus, { label: string; dot: string; ping: boolean; hint: string }> = {
  unknown: { label: "Connecting", dot: "bg-ink-muted", ping: false, hint: "Waiting for market data." },
  live: { label: "Live", dot: "bg-gain", ping: true, hint: "Market data from CoinGecko, refreshed about every minute." },
  stale: { label: "Delayed", dot: "bg-yellow-500", ping: false, hint: "CoinGecko is not responding, so older cached data is shown." },
  unavailable: { label: "Unavailable", dot: "bg-loss", ping: false, hint: "Market data could not be loaded." },
};

/** Health of the live market feed (crypto trades 24/7), based on the latest responses from the backend. */
export function MarketStatus() {
  const status = useMarketStatusStore((state) => state.status);
  const updatedAt = useMarketStatusStore((state) => state.updatedAt);
  const view = PRESENTATION[status];
  const updated = updatedAt ? ` Last updated ${new Date(updatedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}.` : "";

  return (
    <div
      role="status"
      className="hidden items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-ink-muted lg:flex"
      title={`${view.hint}${updated}`}
    >
      <span className="relative flex size-2">
        {view.ping && (
          <span className={`absolute inline-flex size-full animate-ping rounded-full ${view.dot} opacity-60 motion-reduce:animate-none`} />
        )}
        <span className={`relative inline-flex size-2 rounded-full ${view.dot}`} />
      </span>
      <span className="font-medium text-ink">{view.label}</span>
      <span aria-hidden="true">·</span>
      <span>CoinGecko</span>
    </div>
  );
}
