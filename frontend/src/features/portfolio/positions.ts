import type { Coin } from "@/types/market";
import type {
  AllocationSlice,
  PnlBreakdownRow,
  PortfolioDetails,
  PortfolioPosition,
  PortfolioState,
} from "@/types/portfolio";
import { assessPricing, usablePrice } from "./pricing";
import { trackedCoinIds } from "./valuation";

const CASH_COLOR = "#64748b";
const FALLBACK_COLOR = "#64748b";

function percentOf(part: number, base: number): number {
  return base > 0 ? (part / base) * 100 : 0;
}

/** Sorts numbers descending and puts missing values last. */
function byDescendingNullsLast<T>(read: (item: T) => number | null): (a: T, b: T) => number {
  return (a, b) => {
    const left = read(a);
    const right = read(b);
    if (left === null && right === null) return 0;
    if (left === null) return 1;
    if (right === null) return -1;
    return right - left;
  };
}

/**
 * Open holdings valued at current prices, largest first. A holding without a usable live price
 * is kept in the list but has no price, value or profit/loss (null); it is never valued at its
 * purchase price or at zero.
 */
export function computePositions(state: PortfolioState, coins: readonly Coin[]): PortfolioPosition[] {
  const coinsById = new Map(coins.map((coin) => [coin.id, coin] as const));

  const valued = state.holdings.map((holding) => {
    const coin = coinsById.get(holding.coinId);
    const currentPrice = usablePrice(coin?.price);
    const value = currentPrice === null ? null : holding.quantity * currentPrice;
    const costBasis = holding.quantity * holding.averageBuyPrice;
    const pnl = value === null ? null : value - costBasis;
    return {
      coinId: holding.coinId,
      symbol: holding.symbol,
      name: holding.name,
      color: coin?.color ?? FALLBACK_COLOR,
      imageUrl: coin?.imageUrl ?? null,
      quantity: holding.quantity,
      averageBuyPrice: holding.averageBuyPrice,
      priceAvailable: currentPrice !== null,
      currentPrice,
      value,
      costBasis,
      pnl,
      pnlPercent: pnl === null ? null : percentOf(pnl, costBasis),
    };
  });

  // Share of everything that could be priced; unpriced holdings are excluded, not counted as zero.
  const pricedTotal = state.cashBalance + valued.reduce((sum, item) => sum + (item.value ?? 0), 0);

  return valued
    .map((item) => ({
      ...item,
      allocationPercent: item.value === null ? null : percentOf(item.value, pricedTotal),
    }))
    .sort(byDescendingNullsLast((item) => item.value));
}

/** Portfolio split by asset, with cash as its own slice. Unpriced holdings and zero-value slices are left out. */
export function buildAllocation(positions: readonly PortfolioPosition[], cashBalance: number): AllocationSlice[] {
  const priced = positions.flatMap((position) => (position.value === null ? [] : [{ position, value: position.value }]));
  const total = cashBalance + priced.reduce((sum, item) => sum + item.value, 0);

  const slices: AllocationSlice[] = priced.map(({ position, value }) => ({
    id: position.coinId,
    label: position.name,
    color: position.color,
    value,
    percent: percentOf(value, total),
  }));
  slices.push({ id: "cash", label: "Cash", color: CASH_COLOR, value: cashBalance, percent: percentOf(cashBalance, total) });

  return slices.filter((slice) => slice.value > 0);
}

/**
 * Profit and loss per asset: unrealised (open holding vs cost) plus realised (closed by sells).
 * When every holding is priced, summing all rows equals the account's total profit and loss.
 * An open holding without a live price has no unrealised or total figure (null).
 */
export function computePnlBreakdown(
  state: PortfolioState,
  positions: readonly PortfolioPosition[],
  coins: readonly Coin[],
): PnlBreakdownRow[] {
  const coinsById = new Map(coins.map((coin) => [coin.id, coin] as const));
  const positionsById = new Map(positions.map((position) => [position.coinId, position] as const));

  const realizedByCoin = new Map<string, number>();
  const identity = new Map<string, { symbol: string; name: string }>();
  for (const tx of state.transactions) {
    if (tx.status !== "completed") continue;
    identity.set(tx.coinId, { symbol: tx.symbol, name: tx.name });
    if (tx.side === "sell" && tx.realizedPnl !== null) {
      realizedByCoin.set(tx.coinId, (realizedByCoin.get(tx.coinId) ?? 0) + tx.realizedPnl);
    }
  }

  return trackedCoinIds(state)
    .map((coinId): PnlBreakdownRow => {
      const position = positionsById.get(coinId);
      const who = identity.get(coinId) ?? { symbol: position?.symbol ?? coinId, name: position?.name ?? coinId };
      const realized = realizedByCoin.get(coinId) ?? 0;
      const held = position !== undefined;
      const priceAvailable = position?.priceAvailable ?? true;
      // A closed asset has no open position, so its unrealised part is genuinely zero.
      const unrealized = held ? (position.pnl ?? null) : 0;
      return {
        coinId,
        symbol: who.symbol,
        name: who.name,
        color: coinsById.get(coinId)?.color ?? FALLBACK_COLOR,
        imageUrl: coinsById.get(coinId)?.imageUrl ?? null,
        held,
        priceAvailable,
        costBasis: position?.costBasis ?? 0,
        value: held ? position.value : 0,
        unrealized,
        realized,
        total: unrealized === null ? null : unrealized + realized,
      };
    })
    .sort(byDescendingNullsLast((row) => row.total));
}

export function computePortfolioDetails(state: PortfolioState, coins: readonly Coin[]): PortfolioDetails {
  const positions = computePositions(state, coins);
  return {
    positions,
    allocation: buildAllocation(positions, state.cashBalance),
    breakdown: computePnlBreakdown(state, positions, coins),
    valuation: assessPricing(state.holdings, coins),
  };
}
