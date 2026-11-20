import { CURRENCIES, convertFromUsd, effectiveCurrency } from "@/lib/currency";
import type { TickStyle } from "@/types/chart";
import type { CurrencyCode } from "@/types/settings";

function priceDecimals(value: number): number {
  const abs = Math.abs(value);
  if (abs === 0) return 2;
  if (abs < 0.0001) return 8;
  if (abs < 0.01) return 6;
  if (abs < 1) return 4;
  return 2;
}

/** Formats a USD amount in the selected display currency. */
export function formatCurrency(valueUsd: number, requested: CurrencyCode = "USD"): string {
  // A currency without a live exchange rate is shown as USD, never as a converted amount.
  const currency = effectiveCurrency(requested);
  const value = convertFromUsd(valueUsd, currency);
  const max = priceDecimals(value);
  return new Intl.NumberFormat(CURRENCIES[currency].locale, {
    style: "currency",
    currency,
    minimumFractionDigits: Math.min(2, max),
    maximumFractionDigits: max,
  }).format(value);
}

export function formatCompactCurrency(valueUsd: number, requested: CurrencyCode = "USD"): string {
  const currency = effectiveCurrency(requested);
  return new Intl.NumberFormat(CURRENCIES[currency].locale, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(convertFromUsd(valueUsd, currency));
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatQuantity(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 8 }).format(value);
}

export function formatPercent(value: number, options: { showSign?: boolean } = {}): string {
  const { showSign = true } = options;
  const rounded = Math.abs(value) < 0.005 ? 0 : value;
  const sign = showSign && rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(2)}%`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso),
  );
}

/** "+$1,234.00" / "-$1,234.00" for profit and loss figures. */
export function formatSignedCurrency(valueUsd: number, currency: CurrencyCode = "USD"): string {
  const formatted = formatCurrency(Math.abs(valueUsd), currency);
  if (Math.abs(valueUsd) < 0.005) return formatted;
  return `${valueUsd > 0 ? "+" : "-"}${formatted}`;
}

/** Compact for large values, full precision for small ones (keeps sub-dollar prices readable). */
export function formatAxisCurrency(valueUsd: number, currency: CurrencyCode = "USD"): string {
  return Math.abs(valueUsd) >= 1000
    ? formatCompactCurrency(valueUsd, currency)
    : formatCurrency(valueUsd, currency);
}

export function formatChartTick(timestamp: number, style: TickStyle): string {
  const date = new Date(timestamp);
  switch (style) {
    case "time":
      return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(date);
    case "day":
      return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
    case "month":
      return new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit" }).format(date);
  }
}

export function formatChartTooltipDate(timestamp: number, withTime: boolean): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" as const } : {}),
  }).format(new Date(timestamp));
}
