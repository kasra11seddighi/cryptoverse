import { useMemo } from "react";
import { effectiveCurrency } from "@/lib/currency";
import { usePreferencesStore } from "@/stores/preferences.store";
import {
  formatAxisCurrency,
  formatCompactCurrency,
  formatCurrency,
  formatSignedCurrency,
} from "@/utils/format";

type Amount = number | null | undefined;

const UNAVAILABLE = "—";

/**
 * Currency formatters bound to the user's display-currency preference. Inputs are USD.
 * A missing value (null/undefined) renders as an em dash, never as 0 or NaN.
 */
export function useCurrency() {
  const currency = effectiveCurrency(usePreferencesStore((state) => state.currency));

  return useMemo(() => {
    const guard =
      (format: (value: number) => string) =>
      (value: Amount): string =>
        typeof value === "number" && Number.isFinite(value) ? format(value) : UNAVAILABLE;

    return {
      currency,
      format: guard((value) => formatCurrency(value, currency)),
      formatCompact: guard((value) => formatCompactCurrency(value, currency)),
      formatSigned: guard((value) => formatSignedCurrency(value, currency)),
      formatAxis: guard((value) => formatAxisCurrency(value, currency)),
    };
  }, [currency]);
}
