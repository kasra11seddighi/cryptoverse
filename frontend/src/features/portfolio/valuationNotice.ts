import type { MarketFeedStatus } from "@/stores/marketStatus.store";
import type { PortfolioValuation } from "@/types/portfolio";

export interface ValuationNotice {
  id: "incomplete" | "stale" | "unavailable";
  message: string;
}

/**
 * Explains, in plain words, why portfolio figures may be incomplete or out of date.
 * Fresh, complete data produces no notices, so stale data is always distinguishable from fresh data.
 */
export function buildValuationNotices(
  valuation: PortfolioValuation | undefined,
  feed: { status: MarketFeedStatus; updatedAt: string | null },
): ValuationNotice[] {
  const notices: ValuationNotice[] = [];

  if (valuation && !valuation.complete) {
    const symbols = valuation.missingSymbols.join(", ");
    notices.push({
      id: "incomplete",
      message: `Price unavailable for ${symbols}. Totals that need it are not shown, rather than estimated.`,
    });
  }

  if (feed.status === "stale") {
    const when = feed.updatedAt ? ` Last fetched ${new Date(feed.updatedAt).toLocaleTimeString("en-US", { timeStyle: "short" })}.` : "";
    notices.push({ id: "stale", message: `Market data is stale: the provider could not be reached, so cached prices are shown.${when}` });
  } else if (feed.status === "unavailable") {
    notices.push({ id: "unavailable", message: "The latest market data request failed. Figures may be out of date." });
  }

  return notices;
}
