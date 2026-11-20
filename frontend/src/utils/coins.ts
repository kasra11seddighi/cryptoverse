import type { SortDirection } from "@/types/common";
import type { Coin, CoinSort, CoinSortKey } from "@/types/market";

const NATURAL_DIRECTION: Record<CoinSortKey, SortDirection> = {
  rank: "asc",
  name: "asc",
  price: "desc",
  change24h: "desc",
  marketCap: "desc",
  volume24h: "desc",
  circulatingSupply: "desc",
};

/** Stable decorative colour for a coin id, used as the logo fallback. Not market data. */
export function colorFromId(id: string): string {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hue = (hash >>> 0) % 360;
  return `hsl(${hue} 65% 62%)`;
}

export function coinMatchesQuery(coin: Pick<Coin, "name" | "symbol">, query: string): boolean {
  const q = query.trim().toLowerCase();
  return q === "" || coin.name.toLowerCase().includes(q) || coin.symbol.toLowerCase().includes(q);
}

function sortValue(coin: Coin, key: CoinSortKey): number | string | null {
  switch (key) {
    case "rank":
      return coin.rank;
    case "name":
      return coin.name.toLowerCase();
    case "price":
      return coin.price;
    case "change24h":
      return coin.priceChange["24H"];
    case "marketCap":
      return coin.marketCap;
    case "volume24h":
      return coin.volume24h;
    case "circulatingSupply":
      return coin.circulatingSupply;
  }
}

/** Sorts a list of coins. Coins without a value for the sort column go last, in either direction. */
export function sortCoins(coins: readonly Coin[], sort: CoinSort): Coin[] {
  const direction = sort.direction === "asc" ? 1 : -1;
  return [...coins].sort((a, b) => {
    const left = sortValue(a, sort.key);
    const right = sortValue(b, sort.key);
    if (left === null && right === null) return 0;
    if (left === null) return 1;
    if (right === null) return -1;
    return (left < right ? -1 : left > right ? 1 : 0) * direction;
  });
}

/** Header click: toggles direction on the active column, otherwise starts with its natural order. */
export function nextSort(current: CoinSort, key: CoinSortKey): CoinSort {
  return current.key === key
    ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
    : { key, direction: NATURAL_DIRECTION[key] };
}
