import { ChartColumn, TriangleAlert } from "lucide-react";
import { SignedBarChart } from "@/components/charts/SignedBarChart";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatePanel } from "@/components/ui/StatePanel";
import { useCurrency } from "@/hooks/useCurrency";
import { usePortfolioDetails } from "@/features/portfolio/hooks";

export function PnlChartCard() {
  const { formatSigned, formatAxis } = useCurrency();
  const query = usePortfolioDetails();
  const allRows = query.data?.breakdown ?? [];
  // Assets without a live price have no total and are left out of the chart rather than plotted as zero.
  const rows = allRows.flatMap((row) => (row.total === null ? [] : [{ symbol: row.symbol, total: row.total }]));
  const omitted = allRows.length - rows.length;

  return (
    <Card>
      <CardHeader title="Profit / loss by asset" description={omitted > 0 ? `Realised plus unrealised. ${omitted} asset(s) without a live price are not shown.` : "Realised plus unrealised, per asset"} />
      <div className="p-4 sm:p-5">
        {query.isPending ? (
          <div role="status" aria-label="Loading chart">
            <Skeleton className="h-64 w-full" />
          </div>
        ) : query.isError ? (
          <div className="h-64">
            <StatePanel
              tone="error"
              icon={TriangleAlert}
              title="Chart data could not be loaded"
              action={
                <Button variant="secondary" onClick={() => void query.refetch()}>
                  Retry
                </Button>
              }
            />
          </div>
        ) : allRows.length === 0 ? (
          <div className="h-64">
            <StatePanel icon={ChartColumn} title="No profit or loss yet" description="Make a simulated trade to see results by asset." />
          </div>
        ) : (
          <div className="h-64 sm:h-72">
            <SignedBarChart
              data={rows.map((row) => ({ label: row.symbol, value: row.total }))}
              formatValue={formatSigned}
              formatAxisValue={formatAxis}
              ariaLabel={`Profit or loss per asset: ${rows.map((row) => `${row.symbol} ${formatSigned(row.total)}`).join(", ")}`}
            />
          </div>
        )}
      </div>
    </Card>
  );
}
