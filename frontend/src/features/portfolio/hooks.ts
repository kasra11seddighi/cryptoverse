import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { ApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import { priceRefresh } from "@/lib/refresh";
import {
  marketService,
  portfolioHistoryService,
  portfolioService,
} from "@/services";
import type {
  PortfolioRange,
  PortfolioState,
  TradeOrder,
  TradeOutcome,
} from "@/types/portfolio";
import { computePortfolioDetails } from "./positions";
import { computePortfolioSummary } from "./summary";
import { trackedCoinIds } from "./valuation";

const portfolioStateOptions = {
  queryKey: queryKeys.portfolio.state,
  queryFn: () => portfolioService.getPortfolio(),
} as const;

/** The simulated account (cash, holdings, completed transactions) as stored on the server. */
export function usePortfolioState() {
  return useQuery(portfolioStateOptions);
}

/**
 * Derived queries load the account through the shared cache entry, so a failed account request
 * shows up as an error in them too instead of leaving them loading forever.
 */
function useAccountLoader() {
  const queryClient = useQueryClient();
  return (): Promise<PortfolioState> =>
    queryClient.ensureQueryData(portfolioStateOptions);
}

export function usePortfolioSummary() {
  const loadAccount = useAccountLoader();

  return useQuery({
    queryKey: queryKeys.portfolio.summary,
    queryFn: async () => {
      const state = await loadAccount();
      const coins = await marketService.getCoinsByIds(trackedCoinIds(state));
      return computePortfolioSummary(state, coins, Date.now());
    },
    ...priceRefresh,
  });
}

export function usePortfolioPerformance(range: PortfolioRange) {
  const loadAccount = useAccountLoader();

  return useQuery({
    queryKey: queryKeys.portfolio.performance(range),
    queryFn: async () =>
      portfolioHistoryService.getPerformance(await loadAccount(), range),
    placeholderData: keepPreviousData,
  });
}

/** Positions, allocation and per-asset profit and loss, valued at live market prices. */
export function usePortfolioDetails() {
  const loadAccount = useAccountLoader();

  return useQuery({
    queryKey: queryKeys.portfolio.details,
    queryFn: async () => {
      const state = await loadAccount();
      const coins = await marketService.getCoinsByIds(trackedCoinIds(state));
      return computePortfolioDetails(state, coins);
    },
    ...priceRefresh,
  });
}

/** Stores a fresh account snapshot and marks everything derived from it, and the transaction list, as outdated. */
function useApplyAccount() {
  const queryClient = useQueryClient();
  return (state: PortfolioState) => {
    queryClient.setQueryData(queryKeys.portfolio.state, state);
    void queryClient.invalidateQueries({
      queryKey: queryKeys.portfolio.derived,
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.transactions.all,
    });
  };
}

/** Places a simulated order. The server prices it and checks the rules; its error message is shown as is. */
export function useTradeMutation() {
  const queryClient = useQueryClient();
  const apply = useApplyAccount();

  return useMutation<TradeOutcome, ApiError, TradeOrder>({
    mutationFn: (order) => portfolioService.trade(order),
    onSuccess: ({ state }) => apply(state),
    // A rejected order usually means the balance or holdings changed; reload them.
    onError: () =>
      void queryClient.invalidateQueries({
        queryKey: queryKeys.portfolio.state,
      }),
  });
}

/** Deletes every simulated transaction and restores the starting balance. */
export function useResetPortfolioMutation() {
  const apply = useApplyAccount();

  return useMutation<PortfolioState, ApiError, void>({
    mutationFn: () => portfolioService.reset(),
    onSuccess: (state) => apply(state),
  });
}
