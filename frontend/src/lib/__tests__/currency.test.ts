import { describe, expect, it } from "vitest";
import { CURRENCIES, LIVE_RATES_AVAILABLE, convertFromUsd, effectiveCurrency, isCurrencyAvailable } from "../currency";
import { formatCompactCurrency, formatCurrency, formatSignedCurrency } from "@/utils/format";

describe("static exchange rates are never shown as real conversions", () => {
  it("no live rate source is connected", () => {
    expect(LIVE_RATES_AVAILABLE).toBe(false);
  });

  it("only USD is available", () => {
    expect(isCurrencyAvailable("USD")).toBe(true);
    for (const code of ["EUR", "GBP", "JPY"] as const) {
      expect(isCurrencyAvailable(code)).toBe(false);
      expect(effectiveCurrency(code)).toBe("USD");
    }
  });

  it("convertFromUsd does not apply the placeholder rates", () => {
    expect(convertFromUsd(100, "EUR")).toBe(100);
    expect(convertFromUsd(100, "JPY")).toBe(100);
    expect(CURRENCIES.EUR.rate).not.toBe(1); // placeholder stays in the table but is unused
  });

  it("formatters fall back to USD instead of a converted, mislabelled amount", () => {
    const usd = formatCurrency(1_234.5, "USD");
    expect(usd).toBe("$1,234.50");
    for (const code of ["EUR", "GBP", "JPY"] as const) {
      expect(formatCurrency(1_234.5, code)).toBe(usd);
      expect(formatCompactCurrency(1_234_000, code)).toBe(formatCompactCurrency(1_234_000, "USD"));
      expect(formatSignedCurrency(-50, code)).toBe(formatSignedCurrency(-50, "USD"));
    }
  });
});
