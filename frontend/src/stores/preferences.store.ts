import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CurrencyCode, NotificationPreferences, ThemePreference } from "@/types/settings";

interface PreferencesStore {
  theme: ThemePreference;
  currency: CurrencyCode;
  sidebarCollapsed: boolean;
  notifications: NotificationPreferences;
  setTheme: (theme: ThemePreference) => void;
  setCurrency: (currency: CurrencyCode) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setNotification: (key: keyof NotificationPreferences, value: boolean) => void;
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      theme: "dark",
      currency: "USD",
      sidebarCollapsed: false,
      notifications: {
        priceAlerts: true,
        portfolioUpdates: true,
        marketNews: false,
        securityAlerts: true,
        emailDigest: false,
      },
      setTheme: (theme) => set({ theme }),
      setCurrency: (currency) => set({ currency }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setNotification: (key, value) =>
        set((state) => ({ notifications: { ...state.notifications, [key]: value } })),
    }),
    {
      name: "cryptoverse:preferences",
      version: 2,
      // v2: no live exchange rates exist, so a stored non-USD currency is reset to USD.
      migrate: (persisted) => ({ ...(persisted as object), currency: "USD" as CurrencyCode }),
      partialize: ({ theme, currency, sidebarCollapsed, notifications }) => ({
        theme,
        currency,
        sidebarCollapsed,
        notifications,
      }),
    },
  ),
);
