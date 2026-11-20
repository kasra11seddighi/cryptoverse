import { useState } from "react";
import { ChartBody } from "@/components/charts/ChartBody";
import type { ChartStatus } from "@/components/charts/ChartBody";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { PercentChange } from "@/components/ui/PercentChange";
import { RangeSelector } from "@/components/ui/RangeSelector";
import { useCurrency } from "@/hooks/useCurrency";
import { CHART_INTERVALS } from "@/types/market";
import type { ChartInterval } from "@/types/market";
import { getChartTimeConfig, periodChange } from "@/utils/chart";
import { useCoinPriceHistory } from "../hooks";

interface CoinPriceChartProps {
  coinId: string;
  coinName: string;
  initialInterval?: ChartInterval;
  /** Show the lowest and highest price of the selected interval under the chart. */
  showRange?: boolean;
}

/** Price history of one coin with an interval selector. Green or red follows the period's movement. */
export function CoinPriceChart({ coinId, coinName, initialInterval = "7D", showRange = false }: CoinPriceChartProps) {
  const [interval, setInterval] = useState<ChartInterval>(initialInterval);
  const { format, formatAxis } = useCurrency();
  const query = useCoinPriceHistory(coinId, interval);

  const points = query.data ?? [];
  const change = periodChange(points.map((point) => point.value));
  const timeConfig = getChartTimeConfig(interval);
  const prices = points.map((point) => point.value);
  const low = prices.length > 0 ? Math.min(...prices) : null;
  const high = prices.length > 0 ? Math.max(...prices) : null;

  const status: ChartStatus = query.isPending
    ? "loading"
    : query.isError && points.length === 0
      ? "error"
      : points.length < 2 || !change
        ? "empty"
        : "ready";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5">
        <p className="flex items-center gap-2 text-sm text-ink-muted">
          {change ? (
            <>
              <PercentChange value={change.percent} />
              <span>over {interval}</span>
            </>
          ) : (
            <span>{coinName} price</span>
          )}
        </p>
        <RangeSelector
          label={`${coinName} chart interval`}
          options={CHART_INTERVALS}
          value={interval}
          onChange={setInterval}
          getLabel={(option) => (option === "MAX" ? "Max" : option)}
        />
      </div>
      <div className={`px-2 pb-3 pt-4 sm:px-4 ${query.isPlaceholderData ? "opacity-60" : ""}`}>
        <ChartBody
          status={status}
          onRetry={() => void query.refetch()}
          emptyTitle="No price data"
          emptyDescription={`There is no price history for ${coinName} in this range.`}
        >
          <TimeSeriesChart
            data={points}
            tone={change && change.change < 0 ? "negative" : "positive"}
            tickStyle={timeConfig.tick}
            showTime={timeConfig.showTime}
            formatValue={format}
            formatAxisValue={formatAxis}
            ariaLabel={`${coinName} price over ${interval}`}
          />
        </ChartBody>
        {showRange && status === "ready" && low !== null && high !== null && (
          <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 px-2 text-sm">
            <div className="flex gap-2">
              <dt className="text-ink-muted">{interval} low</dt>
              <dd className="tabular-nums">{format(low)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-ink-muted">{interval} high</dt>
              <dd className="tabular-nums">{format(high)}</dd>
            </div>
          </dl>
        )}
      </div>
    </div>
  );
}
