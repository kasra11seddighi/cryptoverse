import { Card, CardHeader } from "@/components/ui/Card";
import { PercentChange } from "@/components/ui/PercentChange";
import { PRICE_CHANGE_PERIODS } from "@/types/market";
import type { Coin } from "@/types/market";

export function CoinPeriodChanges({ coin }: { coin: Coin }) {
  return (
    <Card>
      <CardHeader title="Price change" description="Change over each period" />
      <dl className="grid grid-cols-3 gap-px p-4 sm:grid-cols-5 sm:px-5">
        {PRICE_CHANGE_PERIODS.map((period) => (
          <div key={period} className="py-1">
            <dt className="text-xs text-ink-muted">{period}</dt>
            <dd className="mt-1 text-sm font-medium">
              <PercentChange value={coin.priceChange[period]} showIcon={false} />
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
