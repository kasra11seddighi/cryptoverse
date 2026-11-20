import { MarketOverviewCard } from "@/features/market/components/MarketOverviewCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PoweredByCoinGecko } from "@/components/ui/PoweredByCoinGecko";
import { SimulatedBadge } from "@/components/ui/SimulatedBadge";
import { AllocationCard } from "@/features/portfolio/components/AllocationCard";
import { PortfolioPerformanceChart } from "@/features/portfolio/components/PortfolioPerformanceChart";
import { usePortfolioDetails } from "@/features/portfolio/hooks";
import { AnalyticsMetrics } from "../components/AnalyticsMetrics";
import { PerformersCard } from "../components/PerformersCard";
import { PnlBreakdownTable } from "../components/PnlBreakdownTable";
import { PnlChartCard } from "../components/PnlChartCard";
import { rankPerformers } from "../performers";

export function AnalyticsPage() {
  const details = usePortfolioDetails();
  const performers = rankPerformers(details.data?.positions ?? []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="How your simulated portfolio is performing, valued at live market prices. Balances and trades are simulated."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SimulatedBadge />
            <PoweredByCoinGecko />
          </div>
        }
      />
      <AnalyticsMetrics />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <PortfolioPerformanceChart />
        </div>
        <MarketOverviewCard />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AllocationCard />
        <PnlChartCard />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <PerformersCard
          title="Best performers"
          description="Highest unrealised return"
          positions={performers.best}
          loading={details.isPending}
          emptyMessage="Open a position to see your best performers."
        />
        <PerformersCard
          title="Worst performers"
          description="Lowest unrealised return"
          positions={performers.worst}
          loading={details.isPending}
          emptyMessage="Worst performers appear once you hold at least two assets."
        />
      </div>

      <PnlBreakdownTable />
    </div>
  );
}
