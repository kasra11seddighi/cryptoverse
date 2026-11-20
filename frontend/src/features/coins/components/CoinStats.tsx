import { Card, CardHeader } from "@/components/ui/Card";
import { useCurrency } from "@/hooks/useCurrency";
import type { Coin } from "@/types/market";
import { formatCompactNumber, formatPercent } from "@/utils/format";
import { computeCoinStats } from "../stats";

interface CoinStatsProps {
  coin: Coin;
  totalMarketCap: number | null;
}

const UNAVAILABLE = "—";

export function CoinStats({ coin, totalMarketCap }: CoinStatsProps) {
  const { format, formatCompact } = useCurrency();
  const stats = computeCoinStats(coin, totalMarketCap);
  const percent = (value: number | null) => (value === null ? UNAVAILABLE : formatPercent(value, { showSign: false }));
  const supply = (value: number | null) => (value === null ? UNAVAILABLE : `${formatCompactNumber(value)} ${coin.symbol}`);

  const rows: ReadonlyArray<readonly [string, string]> = [
    ["Market cap", formatCompact(coin.marketCap)],
    ["Fully diluted value", formatCompact(coin.fullyDilutedValue)],
    ["24h volume", formatCompact(coin.volume24h)],
    ["Volume / market cap", percent(stats.volumeToMarketCap)],
    ["24h high", format(coin.high24h)],
    ["24h low", format(coin.low24h)],
    ["All-time high", format(coin.ath)],
    ["From all-time high", coin.athChangePercent === null ? UNAVAILABLE : formatPercent(coin.athChangePercent)],
    ["Circulating supply", supply(coin.circulatingSupply)],
    ["Total supply", supply(coin.totalSupply)],
    ["Max supply", coin.maxSupply === null ? "No fixed cap" : supply(coin.maxSupply)],
    ["Circulating of max", coin.maxSupply === null ? "Not applicable" : percent(stats.circulatingPercent)],
    ["Share of global market cap", percent(stats.marketShare)],
  ];

  return (
    <Card>
      <CardHeader title="Market statistics" description="Live data from CoinGecko" />
      <dl className="divide-y divide-line px-4 pb-2 pt-3 text-sm sm:px-5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-ink-muted">{label}</dt>
            <dd className="text-right tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
