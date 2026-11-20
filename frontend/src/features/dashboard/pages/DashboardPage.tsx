import { PageHeader } from "@/components/ui/PageHeader";
import { PoweredByCoinGecko } from "@/components/ui/PoweredByCoinGecko";
import { SimulatedBadge } from "@/components/ui/SimulatedBadge";
import { MarketOverviewCard } from "@/features/market/components/MarketOverviewCard";
import { TrendingCard } from "@/features/market/components/TrendingCard";
import { PortfolioPerformanceChart } from "@/features/portfolio/components/PortfolioPerformanceChart";
import { PortfolioSummaryCards } from "../components/PortfolioSummaryCards";
import { TopCoinsCard } from "../components/TopCoinsCard";
import { WatchlistPreview } from "../components/WatchlistPreview";

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Your simulated portfolio and the market at a glance."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SimulatedBadge />
            <PoweredByCoinGecko />
          </div>
        }
      />
      <PortfolioSummaryCards />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <PortfolioPerformanceChart />
        </div>
        <MarketOverviewCard />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <TopCoinsCard />
        </div>
        <div className="space-y-6">
          <WatchlistPreview />
          <TrendingCard count={5} />
        </div>
      </div>
    </div>
  );
}
