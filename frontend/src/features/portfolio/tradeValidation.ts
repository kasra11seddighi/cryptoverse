import type { TradeSide } from "@/types/portfolio";
import { formatQuantity } from "@/utils/format";

const MAX_DECIMALS = 8;
const MIN_ORDER_VALUE_USD = 0.01;
const NUMBER_PATTERN = /^(?:\d+\.?\d*|\.\d+)$/;

export interface TradeInput {
  side: TradeSide;
  symbol: string;
  quantityText: string;
  price: number;
  cashBalance: number;
  heldQuantity: number;
}

export interface TradeCheck {
  quantity: number | null;
  total: number;
  /** Message to show, or null when the order is valid. */
  error: string | null;
}

/** Largest quantity that can be bought with the cash, rounded down so it never overspends. */
export function maxBuyQuantity(cashBalance: number, price: number): number {
  if (price <= 0 || cashBalance <= 0) return 0;
  const factor = 10 ** MAX_DECIMALS;
  return Math.floor((cashBalance / price) * factor) / factor;
}

/** Pure validation of a simulated order. The ledger remains the final authority. */
export function checkTrade(input: TradeInput): TradeCheck {
  const { side, symbol, quantityText, price, cashBalance, heldQuantity } = input;
  const text = quantityText.trim();
  const invalid = (error: string): TradeCheck => ({ quantity: null, total: 0, error });

  if (text === "") return invalid("Enter a quantity.");
  if (!NUMBER_PATTERN.test(text)) return invalid("Enter a valid number, like 0.5.");

  const decimals = text.split(".")[1]?.length ?? 0;
  if (decimals > MAX_DECIMALS) return invalid(`Use at most ${MAX_DECIMALS} decimal places.`);

  const quantity = Number(text);
  if (!Number.isFinite(quantity) || quantity <= 0) return invalid("Quantity must be greater than zero.");
  if (!(price > 0)) return invalid("The price for this asset is unavailable.");

  const total = quantity * price;
  const result = (error: string | null): TradeCheck => ({ quantity, total, error });

  if (total < MIN_ORDER_VALUE_USD) return result("The order value is too small.");

  if (side === "buy" && total > cashBalance + 1e-9) {
    return result(`Not enough virtual balance. You can buy up to ${formatQuantity(maxBuyQuantity(cashBalance, price))} ${symbol}.`);
  }
  if (side === "sell") {
    if (heldQuantity <= 0) return result(`You don't hold any ${symbol}.`);
    if (quantity > heldQuantity + 1e-10) return result(`You only hold ${formatQuantity(heldQuantity)} ${symbol}.`);
  }
  return result(null);
}
