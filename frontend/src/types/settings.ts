export const CURRENCY_CODES = ["USD", "EUR", "GBP", "JPY"] as const;
export type CurrencyCode = (typeof CURRENCY_CODES)[number];

export type ThemePreference = "dark" | "light" | "system";

export interface NotificationPreferences {
  priceAlerts: boolean;
  portfolioUpdates: boolean;
  marketNews: boolean;
  securityAlerts: boolean;
  emailDigest: boolean;
}
