import { useState } from "react";
import { ChartBody } from "@/components/charts/ChartBody";
import type { ChartStatus } from "@/components/charts/ChartBody";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { Card, CardHeader } from "@/components/ui/Card";
import { PercentChange } from "@/components/ui/PercentChange";
import { RangeSelector } from "@/components/ui/RangeSelector";
import { useCurrency } from "@/hooks/useCurrency";
import { PORTFOLIO_RANGES } from "@/types/portfolio";
import type { PortfolioRange } from "@/types/portfolio";
import { getChartTimeConfig, periodChange } from "@/utils/chart";
import { usePortfolioPerformance } from "../hooks";

const RANGE_NAMES: Record<PortfolioRange, string> = {
  "24H": "the last 24 hours",
  "7D": "the last 7 days",
  "1M": "the last month",
  "3M": "the last 3 months",
  "1Y": "the last year",
  ALL: "all time",
};

export function PortfolioPerformanceChart() {
  const [range, setRange] = useState<PortfolioRange>("1M");
  const { format, formatAxis } = useCurrency();
  const query = usePortfolioPerformance(range);

  const points = query.data ?? [];
  const change = periodChange(points.map((point) => point.value));
  const latest = points[points.length - 1];
  const timeConfig = getChartTimeConfig(range);

  const status: ChartStatus = query.isPending
    ? "loading"
    : query.isError && points.length === 0
      ? "error"
      : points.length < 2 || !change || !latest
        ? "empty"
        : "ready";

  const description =
    status === "ready" && change && latest ? (
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-medium tabular-nums text-ink">{format(latest.value)}</span>
        <PercentChange value={change.percent} />
        <span>over {RANGE_NAMES[range]}</span>
      </span>
    ) : (
      "Total value of cash and holdings over time"
    );

  return (
    <Card>
      <CardHeader
        title="Portfolio performance"
        description={description}
        actions={
          <RangeSelector
            label="Portfolio chart range"
            options={PORTFOLIO_RANGES}
            value={range}
            onChange={setRange}
            getLabel={(option) => (option === "ALL" ? "All" : option)}
          />
        }
      />
      <div className={`px-2 pb-3 pt-4 sm:px-4 ${query.isPlaceholderData ? "opacity-60" : ""}`}>
        <ChartBody
          status={status}
          onRetry={() => void query.refetch()}
          emptyTitle="No portfolio history yet"
          emptyDescription="Make a simulated trade and your portfolio's value will be charted here."
        >
          <TimeSeriesChart
            data={points}
            tone={change && change.change < 0 ? "negative" : "positive"}
            tickStyle={timeConfig.tick}
            showTime={timeConfig.showTime}
            formatValue={format}
            formatAxisValue={formatAxis}
            ariaLabel={
              change && latest
                ? `Portfolio value over ${RANGE_NAMES[range]}, now ${format(latest.value)}`
                : "Portfolio value chart"
            }
          />
        </ChartBody>
        <p className="mt-2 px-2 text-xs text-ink-muted">
          Your simulated transactions valued at real historical prices. Hourly or daily data, so it is an estimate.
        </p>
      </div>
    </Card>
  );
}
