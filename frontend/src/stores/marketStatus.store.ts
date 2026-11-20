import { create } from "zustand";

export type MarketFeedStatus = "unknown" | "live" | "stale" | "unavailable";

interface MarketStatusStore {
  status: MarketFeedStatus;
  /** When the freshest data shown was fetched from the provider (ISO 8601). */
  updatedAt: string | null;
  reportSuccess: (meta: { fetchedAt: string; stale: boolean } | undefined) => void;
  reportFailure: () => void;
}

/** Health of the market data feed, shown in the header. Memory only, never persisted. */
export const useMarketStatusStore = create<MarketStatusStore>()((set) => ({
  status: "unknown",
  updatedAt: null,
  reportSuccess: (meta) =>
    set({ status: meta?.stale ? "stale" : "live", updatedAt: meta?.fetchedAt ?? null }),
  reportFailure: () => set({ status: "unavailable" }),
}));
