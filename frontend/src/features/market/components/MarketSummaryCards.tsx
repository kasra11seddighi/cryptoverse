import { Bitcoin, ChartColumn, Coins, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { useCurrency } from "@/hooks/useCurrency";
import { formatPercent } from "@/utils/format";
import { useMarketOverview } from "../hooks";

export function MarketSummaryCards() {
  const { formatCompact } = useCurrency();
  const { data, isPending, isError } = useMarketOverview();
  const state = { loading: isPending, error: isError || (!isPending && !data) };
  const breadth = data?.breadth ?? null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Market capitalisation"
        icon={Coins}
        value={data ? formatCompact(data.totalMarketCap) : ""}
        change={data?.marketCapChange24h}
        changeLabel="24h"
        {...state}
      />
      <StatCard
        label="24h trading volume"
        icon={ChartColumn}
        value={data ? formatCompact(data.totalVolume24h) : ""}
        hint={data?.activeCryptocurrencies != null ? `${new Intl.NumberFormat("en-US").format(data.activeCryptocurrencies)} active coins` : undefined}
        {...state}
      />
      <StatCard
        label="Bitcoin dominance"
        icon={Bitcoin}
        value={data ? (data.btcDominance === null ? "—" : formatPercent(data.btcDominance, { showSign: false })) : ""}
        hint="of total market cap"
        {...state}
      />
      <StatCard
        label="Gainers / losers"
        icon={TrendingUp}
        value={data ? (breadth ? `${breadth.gainers} / ${breadth.losers}` : "—") : ""}
        hint={breadth ? `top ${breadth.sampleSize} coins, 24h` : "not available"}
        {...state}
      />
    </div>
  );
}
