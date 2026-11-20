import { Link } from "react-router-dom";
import { PATHS } from "@/app/router/paths";
import { Card, CardHeader } from "@/components/ui/Card";
import { CoinLogo } from "@/components/ui/CoinLogo";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCurrency } from "@/hooks/useCurrency";
import { usePortfolioDetails } from "@/features/portfolio/hooks";

export function PnlBreakdownTable() {
  const { format, formatSigned } = useCurrency();
  const query = usePortfolioDetails();
  const rows = query.data?.breakdown ?? [];

  // Totals that depend on a missing price are not shown, instead of adding up a partial sum.
  const complete = rows.every((row) => row.priceAvailable);
  const totals = rows.reduce(
    (sum, row) => ({
      costBasis: sum.costBasis + row.costBasis,
      value: sum.value + (row.value ?? 0),
      unrealized: sum.unrealized + (row.unrealized ?? 0),
      realized: sum.realized + row.realized,
      total: sum.total + (row.total ?? 0),
    }),
    { costBasis: 0, value: 0, unrealized: 0, realized: 0, total: 0 },
  );

  const tone = (value: number | null) => (value === null || Math.abs(value) < 0.005 ? "" : value < 0 ? "text-loss" : "text-gain");

  return (
    <Card>
      <CardHeader title="Profit / loss breakdown" description="Open positions are valued at live market prices" />
      {query.isPending ? (
        <div role="status" aria-label="Loading breakdown" className="space-y-2 p-4 sm:px-5">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : query.isError || rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-ink-muted sm:px-5">
          {query.isError ? "The breakdown could not be loaded." : "No trades yet, so there is nothing to break down."}
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <caption className="sr-only">Profit and loss per asset</caption>
            <thead>
              <tr className="text-xs text-ink-muted">
                <th scope="col" className="py-3 pl-4 text-left font-medium sm:pl-5">Asset</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Cost basis</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Value</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Unrealised</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Realised</th>
                <th scope="col" className="py-3 pl-4 pr-4 text-right font-medium sm:pr-5">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.coinId} className="border-t border-line">
                  <td className="py-3 pl-4 sm:pl-5">
                    <Link to={PATHS.coin(row.coinId)} className="flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-cyan">
                      <CoinLogo symbol={row.symbol} color={row.color} imageUrl={row.imageUrl} size={26} />
                      <span className="font-medium">{row.symbol}</span>
                      {!row.held && <span className="text-xs text-ink-muted">(closed)</span>}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-muted">{row.held ? format(row.costBasis) : "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.held ? format(row.value) : "—"}</td>
                  <td className={`px-4 py-3 text-right tabular-nums ${tone(row.unrealized)}`}>{row.held ? formatSigned(row.unrealized) : "—"}</td>
                  <td className={`px-4 py-3 text-right tabular-nums ${tone(row.realized)}`}>{formatSigned(row.realized)}</td>
                  <td className={`py-3 pl-4 pr-4 text-right font-medium tabular-nums sm:pr-5 ${tone(row.total)}`}>
                    {formatSigned(row.total)}
                    {!row.priceAvailable && <span className="block text-xs font-normal text-ink-muted">Price unavailable</span>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line font-medium">
                <th scope="row" className="py-3 pl-4 text-left sm:pl-5">Total</th>
                <td className="px-4 py-3 text-right tabular-nums text-ink-muted">{format(totals.costBasis)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{complete ? format(totals.value) : "—"}</td>
                <td className={`px-4 py-3 text-right tabular-nums ${tone(complete ? totals.unrealized : null)}`}>{complete ? formatSigned(totals.unrealized) : "—"}</td>
                <td className={`px-4 py-3 text-right tabular-nums ${tone(totals.realized)}`}>{formatSigned(totals.realized)}</td>
                <td className={`py-3 pl-4 pr-4 text-right tabular-nums sm:pr-5 ${tone(complete ? totals.total : null)}`}>{complete ? formatSigned(totals.total) : "—"}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Card>
  );
}
