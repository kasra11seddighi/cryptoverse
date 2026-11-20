import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import { watchlistService } from "@/services";
import type { CoinSort } from "@/types/market";
import type { WatchlistState } from "@/types/watchlist";

const DEFAULT_SORT: CoinSort = { key: "rank", direction: "asc" };
const NO_COINS: readonly string[] = [];
const MUTATION_KEY = ["watchlist", "mutation"] as const;

/**
 * A change that is applied to the cached watchlist immediately and sent to the server.
 * If the server refuses, the previous list is restored. The list is reloaded once the last
 * pending change has finished, so quick successive clicks cannot overwrite each other.
 */
function useWatchlistMutation<Variables>(
  send: (variables: Variables) => Promise<WatchlistState>,
  apply: (current: WatchlistState, variables: Variables) => WatchlistState,
) {
  const queryClient = useQueryClient();

  return useMutation<WatchlistState, ApiError, Variables, { previous: WatchlistState | undefined }>({
    mutationKey: MUTATION_KEY,
    mutationFn: send,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.watchlist });
      const previous = queryClient.getQueryData<WatchlistState>(queryKeys.watchlist);
      if (previous) queryClient.setQueryData(queryKeys.watchlist, apply(previous, variables));
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.watchlist, context.previous);
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: MUTATION_KEY }) <= 1) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.watchlist });
      }
    },
  });
}

/** The followed coins and their sort order, plus the actions that change them. */
export function useWatchlistToggle() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: queryKeys.watchlist, queryFn: () => watchlistService.get() });

  const add = useWatchlistMutation(
    (coinId: string) => watchlistService.add(coinId),
    (current, coinId) => (current.coinIds.includes(coinId) ? current : { ...current, coinIds: [...current.coinIds, coinId] }),
  );
  const remove = useWatchlistMutation(
    (coinId: string) => watchlistService.remove(coinId),
    (current, coinId) => ({ ...current, coinIds: current.coinIds.filter((id) => id !== coinId) }),
  );
  const setSortMutation = useWatchlistMutation(
    (sort: CoinSort) => watchlistService.setSort(sort),
    (current, sort) => ({ ...current, sort }),
  );

  const coinIds = (query.data?.coinIds ?? NO_COINS) as string[];
  const watchedIds = useMemo<ReadonlySet<string>>(() => new Set(coinIds), [coinIds]);

  return {
    coinIds,
    watchedIds,
    sort: query.data?.sort ?? DEFAULT_SORT,
    isLoading: query.isPending,
    isError: query.isError,
    refetch: () => void query.refetch(),
    add: (coinId: string) => add.mutate(coinId),
    remove: (coinId: string) => remove.mutate(coinId),
    setSort: (sort: CoinSort) => setSortMutation.mutate(sort),
    /** Follows the coin if it is not followed yet, otherwise unfollows it. Ignored until the list has loaded. */
    toggle: (coinId: string) => {
      const current = queryClient.getQueryData<WatchlistState>(queryKeys.watchlist);
      if (!current) return;
      if (current.coinIds.includes(coinId)) remove.mutate(coinId);
      else add.mutate(coinId);
    },
  };
}
