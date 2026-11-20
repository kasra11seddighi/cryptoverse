import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { PATHS } from "@/app/router/paths";
import { Card, CardHeader } from "@/components/ui/Card";
import { PercentChange } from "@/components/ui/PercentChange";
import { useCurrency } from "@/hooks/useCurrency";
import { CoinPriceChart } from "@/features/coins/components/CoinPriceChart";
import { useCoins } from "../hooks";

const CHART_COIN_COUNT = 8;
const DEFAULT_COIN_ID = "bitcoin";

/** Price chart for a coin picked from the top of the market. */
export function MarketChartPanel() {
  const { format } = useCurrency();
  const [selectedId, setSelectedId] = useState(DEFAULT_COIN_ID);
  const { data } = useCoins({ page: 1, pageSize: CHART_COIN_COUNT });

  const coins = data?.items ?? [];
  const selected = coins.find((coin) => coin.id === selectedId) ?? coins[0];

  return (
    <Card>
      <CardHeader
        title="Price chart"
        description={
          selected ? (
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-medium tabular-nums text-ink">{format(selected.price)}</span>
              <PercentChange value={selected.priceChange["24H"]} />
              <span>24h</span>
              <Link
                to={PATHS.coin(selected.id)}
                className="inline-flex items-center gap-0.5 text-accent hover:underline focus-visible:outline-2 focus-visible:outline-cyan"
              >
                View {selected.name}
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            </span>
          ) : (
            "Select a cryptocurrency"
          )
        }
        actions={
          <div className="flex items-center gap-2">
            <label htmlFor="chart-coin" className="sr-only">
              Cryptocurrency
            </label>
            <select
              id="chart-coin"
              value={selected?.id ?? ""}
              disabled={coins.length === 0}
              onChange={(event) => setSelectedId(event.target.value)}
              className="h-9 rounded-lg border border-line bg-canvas px-2 text-sm text-ink focus:outline-2 focus:outline-cyan/40 disabled:opacity-60"
            >
              {coins.length === 0 && <option value="">Loading…</option>}
              {coins.map((coin) => (
                <option key={coin.id} value={coin.id}>
                  {coin.name} ({coin.symbol})
                </option>
              ))}
            </select>
          </div>
        }
      />
      <div className="pt-4">
        <CoinPriceChart coinId={selected?.id ?? DEFAULT_COIN_ID} coinName={selected?.name ?? "Bitcoin"} />
      </div>
      <p className="px-4 pb-4 text-xs text-ink-muted sm:px-5">Live prices from CoinGecko.</p>
    </Card>
  );
}
