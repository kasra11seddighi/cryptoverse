import type { CurrencyCode } from "@/types/settings";

interface CurrencyInfo {
  label: string;
  symbol: string;
  locale: string;
  /**
   * Fixed approximate rate relative to USD. These are placeholders, NOT live exchange rates, and are
   * never applied while LIVE_RATES_AVAILABLE is false. Replace them with rates from a real source first.
   */
  rate: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  USD: { label: "US Dollar", symbol: "$", locale: "en-US", rate: 1 },
  EUR: { label: "Euro", symbol: "€", locale: "de-DE", rate: 0.92 },
  GBP: { label: "British Pound", symbol: "£", locale: "en-GB", rate: 0.79 },
  JPY: { label: "Japanese Yen", symbol: "¥", locale: "ja-JP", rate: 150 },
};

/** No live exchange-rate source is connected, so only USD (the currency market data comes in) is real. */
export const LIVE_RATES_AVAILABLE = false;

/** A currency can be selected and shown only when it needs no conversion or live rates exist. */
export function isCurrencyAvailable(currency: CurrencyCode): boolean {
  return currency === "USD" || LIVE_RATES_AVAILABLE;
}

/** The currency actually used for display. A stored choice that is not available falls back to USD. */
export function effectiveCurrency(currency: CurrencyCode): CurrencyCode {
  return isCurrencyAvailable(currency) ? currency : "USD";
}

export function convertFromUsd(valueUsd: number, currency: CurrencyCode): number {
  return isCurrencyAvailable(currency) ? valueUsd * CURRENCIES[currency].rate : valueUsd;
}
