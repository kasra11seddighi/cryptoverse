import { Card, CardHeader } from "@/components/ui/Card";
import type { CoinDetail } from "@/types/market";

/** Description and categories from the market provider. Renders nothing when neither is available. */
export function AboutCoin({ coin }: { coin: CoinDetail }) {
  if (!coin.description && coin.categories.length === 0) return null;

  return (
    <Card>
      <CardHeader title={`About ${coin.name}`} />
      <div className="space-y-3 p-4 sm:p-5">
        {coin.description && <p className="text-sm leading-relaxed text-ink-muted">{coin.description}</p>}
        {coin.categories.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Categories">
            {coin.categories.map((category) => (
              <li key={category} className="rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-xs text-ink-muted">
                {category}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
