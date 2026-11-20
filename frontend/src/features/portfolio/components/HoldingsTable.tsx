import { Link } from "react-router-dom";
import { Coins, TriangleAlert } from "lucide-react";
import { PATHS } from "@/app/router/paths";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { CoinLogo } from "@/components/ui/CoinLogo";
import { PercentChange } from "@/components/ui/PercentChange";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatePanel } from "@/components/ui/StatePanel";
import { useCurrency } from "@/hooks/useCurrency";
import type { PortfolioPosition, TradeSide } from "@/types/portfolio";
import { formatPercent, formatQuantity } from "@/utils/format";
import { usePortfolioDetails } from "../hooks";

interface HoldingsTableProps {
  onTrade: (coinId: string, side: TradeSide) => void;
}

export function HoldingsTable({ onTrade }: HoldingsTableProps) {
  const query = usePortfolioDetails();
  const positions = query.data?.positions ?? [];

  return (
    <Card>
      <CardHeader title="Holdings" description="Valued at live market prices" />
      <div className="mt-3">
        {query.isPending ? (
          <div role="status" aria-label="Loading holdings" className="space-y-2 p-4 sm:px-5">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : query.isError ? (
          <StatePanel
            tone="error"
            icon={TriangleAlert}
            title="Holdings could not be loaded"
            action={
              <Button variant="secondary" onClick={() => void query.refetch()}>
                Retry
              </Button>
            }
          />
        ) : positions.length === 0 ? (
          <StatePanel
            icon={Coins}
            title="No holdings yet"
            description="Use the trade panel to make a simulated purchase."
          />
        ) : (
          <HoldingsList positions={positions} onTrade={onTrade} />
        )}
      </div>
    </Card>
  );
}

function PnlCell({ position }: { position: PortfolioPosition }) {
  const { formatSigned } = useCurrency();
  if (position.pnl === null) {
    return (
      <>
        <span className="block tabular-nums text-ink-muted">—</span>
        <span className="block text-xs text-ink-muted">Price unavailable</span>
      </>
    );
  }
  const tone = position.pnl < 0 ? "text-loss" : "text-gain";
  return (
    <>
      <span className={`block tabular-nums ${tone}`}>{formatSigned(position.pnl)}</span>
      <span className="block text-xs">
        <PercentChange value={position.pnlPercent} />
      </span>
    </>
  );
}

function TradeButtons({ position, onTrade }: { position: PortfolioPosition; onTrade: HoldingsTableProps["onTrade"] }) {
  return (
    <div className="flex justify-end gap-1.5">
      <Button size="sm" variant="secondary" aria-label={`Buy more ${position.name}`} onClick={() => onTrade(position.coinId, "buy")}>
        Buy
      </Button>
      <Button size="sm" variant="secondary" aria-label={`Sell ${position.name}`} onClick={() => onTrade(position.coinId, "sell")}>
        Sell
      </Button>
    </div>
  );
}

function HoldingsList({ positions, onTrade }: { positions: readonly PortfolioPosition[]; onTrade: HoldingsTableProps["onTrade"] }) {
  const { format } = useCurrency();

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">Simulated holdings with quantity, prices, value and profit or loss</caption>
          <thead>
            <tr className="text-xs text-ink-muted">
              <th scope="col" className="py-3 pl-4 text-left font-medium sm:pl-5">Asset</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Quantity</th>
              <th scope="col" className="hidden px-4 py-3 text-right font-medium lg:table-cell">Avg. buy</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Price</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Value</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">P/L</th>
              <th scope="col" className="hidden px-4 py-3 text-right font-medium xl:table-cell">Weight</th>
              <th scope="col" className="py-3 pr-4 text-right font-medium sm:pr-5">
                <span className="sr-only">Trade</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position) => (
              <tr key={position.coinId} className="border-t border-line transition-colors hover:bg-surface-2/40">
                <td className="py-3 pl-4 sm:pl-5">
                  <Link to={PATHS.coin(position.coinId)} className="flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-cyan">
                    <CoinLogo symbol={position.symbol} color={position.color} imageUrl={position.imageUrl} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{position.name}</span>
                      <span className="block text-xs text-ink-muted">{position.symbol}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{formatQuantity(position.quantity)}</td>
                <td className="hidden px-4 py-3 text-right tabular-nums text-ink-muted lg:table-cell">{format(position.averageBuyPrice)}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {format(position.currentPrice)}
                  {!position.priceAvailable && <span className="block text-xs text-ink-muted">Price unavailable</span>}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{format(position.value)}</td>
                <td className="px-4 py-3 text-right"><PnlCell position={position} /></td>
                <td className="hidden px-4 py-3 text-right tabular-nums text-ink-muted xl:table-cell">
                  {position.allocationPercent === null ? "—" : formatPercent(position.allocationPercent, { showSign: false })}
                </td>
                <td className="py-3 pr-4 sm:pr-5"><TradeButtons position={position} onTrade={onTrade} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-line md:hidden" aria-label="Holdings">
        {positions.map((position) => (
          <li key={position.coinId} className="space-y-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <CoinLogo symbol={position.symbol} color={position.color} imageUrl={position.imageUrl} />
              <Link to={PATHS.coin(position.coinId)} className="min-w-0 flex-1 rounded-md focus-visible:outline-2 focus-visible:outline-cyan">
                <span className="block truncate text-sm font-medium">{position.name}</span>
                <span className="block text-xs text-ink-muted">
                  {formatQuantity(position.quantity)} {position.symbol} · avg {format(position.averageBuyPrice)}
                </span>
              </Link>
              <div className="text-right text-sm">
                <span className="block tabular-nums">{format(position.value)}</span>
                <PnlCell position={position} />
              </div>
            </div>
            <TradeButtons position={position} onTrade={onTrade} />
          </li>
        ))}
      </ul>
    </>
  );
}
