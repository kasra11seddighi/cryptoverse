import type { PortfolioPosition } from "@/types/portfolio";

export interface Performers {
  best: PortfolioPosition[];
  worst: PortfolioPosition[];
}

const LIST_SIZE = 3;

/**
 * Best and worst open positions by unrealised return. The two lists never share an asset:
 * with one holding only "best" is filled, with few holdings each list gets half of them.
 */
export function rankPerformers(positions: readonly PortfolioPosition[]): Performers {
  // Only positions with a live price can be ranked; unpriced ones are left out, never ranked as 0%.
  const ranked = positions
    .flatMap((position) => (position.pnlPercent === null ? [] : [{ position, percent: position.pnlPercent }]))
    .sort((a, b) => b.percent - a.percent)
    .map((item) => item.position);
  if (ranked.length <= 1) return { best: ranked, worst: [] };

  const size = Math.min(LIST_SIZE, Math.floor(ranked.length / 2));
  return { best: ranked.slice(0, size), worst: ranked.slice(-size).reverse() };
}
