import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { GuestOnly, RequireAuth } from "@/features/auth/components/RouteGuards";
import { RouteErrorPage } from "./RouteErrorPage";

export const router = createBrowserRouter([
  {
    Component: RequireAuth,
    children: [
      {
        Component: AppShell,
        children: [
          {
            // Pathless route: page errors render inside the shell instead of replacing it.
            ErrorBoundary: RouteErrorPage,
            children: [
              {
                index: true,
                lazy: async () => ({
                  Component: (await import("@/features/dashboard/pages/DashboardPage")).DashboardPage,
                }),
              },
              {
                path: "markets",
                lazy: async () => ({
                  Component: (await import("@/features/market/pages/MarketsPage")).MarketsPage,
                }),
              },
              {
                path: "markets/:coinId",
                lazy: async () => ({
                  Component: (await import("@/features/coins/pages/CoinDetailsPage")).CoinDetailsPage,
                }),
              },
              {
                path: "watchlist",
                lazy: async () => ({
                  Component: (await import("@/features/watchlist/pages/WatchlistPage")).WatchlistPage,
                }),
              },
              {
                path: "portfolio",
                lazy: async () => ({
                  Component: (await import("@/features/portfolio/pages/PortfolioPage")).PortfolioPage,
                }),
              },
              {
                path: "transactions",
                lazy: async () => ({
                  Component: (await import("@/features/transactions/pages/TransactionsPage")).TransactionsPage,
                }),
              },
              {
                path: "analytics",
                lazy: async () => ({
                  Component: (await import("@/features/analytics/pages/AnalyticsPage")).AnalyticsPage,
                }),
              },
              {
                path: "settings",
                lazy: async () => ({
                  Component: (await import("@/features/settings/pages/SettingsPage")).SettingsPage,
                }),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    Component: GuestOnly,
    children: [
      {
        path: "login",
        lazy: async () => ({
          Component: (await import("@/features/auth/pages/LoginPage")).LoginPage,
        }),
      },
      {
        path: "register",
        lazy: async () => ({
          Component: (await import("@/features/auth/pages/RegisterPage")).RegisterPage,
        }),
      },
    ],
  },
  {
    path: "*",
    lazy: async () => ({
      Component: (await import("@/features/errors/pages/NotFoundPage")).NotFoundPage,
    }),
  },
]);
