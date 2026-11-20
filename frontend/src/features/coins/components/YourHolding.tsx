import { PATHS } from "@/app/router/paths";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card, CardHeader } from "@/components/ui/Card";
import { PercentChange } from "@/components/ui/PercentChange";
import { useCurrency } from "@/hooks/useCurrency";
import { usePortfolioState } from "@/features/portfolio/hooks";
import { usablePrice } from "@/features/portfolio/pricing";
import type { Coin } from "@/types/market";
import { formatQuantity } from "@/utils/format";

/** The user's simulated position in this coin. Renders nothing when there is none. */
export function YourHolding({ coin }: { coin: Coin }) {
  const { format, formatSigned } = useCurrency();
  const holding = usePortfolioState().data?.holdings.find((item) => item.coinId === coin.id);
  if (!holding) return null;

  const price = usablePrice(coin.price);
  const value = price === null ? null : holding.quantity * price;
  const cost = holding.quantity * holding.averageBuyPrice;
  const pnl = value === null ? null : value - cost;

  return (
    <Card>
      <CardHeader title="Your position" description="Simulated holding" />
      <dl className="divide-y divide-line px-4 pb-1 pt-3 text-sm sm:px-5">
        <Row label="Quantity" value={`${formatQuantity(holding.quantity)} ${coin.symbol}`} />
        <Row label="Current value" value={format(value)} />
        <Row label="Average buy price" value={format(holding.averageBuyPrice)} />
        <div className="flex items-center justify-between gap-4 py-2.5">
          <dt className="text-ink-muted">Unrealised P/L</dt>
          <dd className={`text-right tabular-nums ${pnl === null ? "text-ink-muted" : pnl < 0 ? "text-loss" : "text-gain"}`}>
            {pnl === null ? (
              "— (Price unavailable)"
            ) : (
              <>
                {formatSigned(pnl)} <span className="text-xs">(<PercentChange value={cost > 0 ? (pnl / cost) * 100 : 0} showIcon={false} />)</span>
              </>
            )}
          </dd>
        </div>
      </dl>
      <div className="flex gap-2 px-4 pb-4 pt-2 sm:px-5">
        <ButtonLink to={PATHS.portfolioTrade(coin.id, "buy")} size="sm">
          Buy more
        </ButtonLink>
        <ButtonLink to={PATHS.portfolioTrade(coin.id, "sell")} size="sm">
          Sell
        </ButtonLink>
      </div>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </div>
  );
}
