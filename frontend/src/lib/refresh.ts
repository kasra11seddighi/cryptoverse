/**
 * Automatic refresh of live prices. The backend caches market data for about a minute, so asking
 * more often would only return the same numbers. Polling pauses while the tab is in the background.
 */
export const PRICE_REFRESH_MS = 60_000;

export const priceRefresh = {
  refetchInterval: PRICE_REFRESH_MS,
  refetchIntervalInBackground: false,
} as const;
