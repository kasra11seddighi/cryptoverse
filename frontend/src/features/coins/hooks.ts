import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { priceRefresh } from "@/lib/refresh";
import { marketService } from "@/services";
import type { TimeSeriesPoint } from "@/types/chart";
import type { ChartInterval } from "@/types/market";

/** `id` is a CoinGecko coin id such as "bitcoin". */
export function useCoin(id: string) {
  return useQuery({
    queryKey: queryKeys.market.coin(id.toLowerCase()),
    queryFn: () => marketService.getCoin(id),
    ...priceRefresh,
  });
}

export function useCoinPriceHistory(coinId: string, interval: ChartInterval) {
  return useQuery({
    queryKey: queryKeys.market.history(coinId, interval),
    queryFn: () => marketService.getPriceHistory(coinId, interval),
    select: (points): TimeSeriesPoint[] =>
      points.map((point) => ({
        timestamp: point.timestamp,
        value: point.price,
      })),
    // Keep the previous range on screen while switching intervals, but never another coin's chart.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[2] === coinId ? previous : undefined,
  });
}
