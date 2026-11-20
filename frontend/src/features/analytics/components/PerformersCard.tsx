import { Link } from "react-router-dom";
import { PATHS } from "@/app/router/paths";
import { Card, CardHeader } from "@/components/ui/Card";
import { CoinLogo } from "@/components/ui/CoinLogo";
import { PercentChange } from "@/components/ui/PercentChange";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCurrency } from "@/hooks/useCurrency";
import type { PortfolioPosition } from "@/types/portfolio";

interface PerformersCardProps {
  title: string;
  description: string;
  positions: readonly PortfolioPosition[];
  loading: boolean;
  emptyMessage: string;
}

/** Ranked list of open positions by unrealised return. */
export function PerformersCard({ title, description, positions, loading, emptyMessage }: PerformersCardProps) {
  const { formatSigned } = useCurrency();

  return (
    <Card>
      <CardHeader title={title} description={description} />
      {loading ? (
        <div role="status" aria-label={`Loading ${title}`} className="space-y-2 p-4 sm:px-5">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : positions.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-ink-muted sm:px-5">{emptyMessage}</p>
      ) : (
        <ol className="mt-2 divide-y divide-line pb-2">
          {positions.map((position, index) => (
            <li key={position.coinId}>
              <Link
                to={PATHS.coin(position.coinId)}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-2/40 focus-visible:outline-2 focus-visible:outline-cyan sm:px-5"
              >
                <span className="w-4 text-xs tabular-nums text-ink-muted">{index + 1}</span>
                <CoinLogo symbol={position.symbol} color={position.color} imageUrl={position.imageUrl} size={28} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{position.name}</span>
                  <span className="block text-xs text-ink-muted">{position.symbol}</span>
                </span>
                <span className="text-right text-sm">
                  <span className="block"><PercentChange value={position.pnlPercent} /></span>
                  <span className="block text-xs tabular-nums text-ink-muted">{formatSigned(position.pnl)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
