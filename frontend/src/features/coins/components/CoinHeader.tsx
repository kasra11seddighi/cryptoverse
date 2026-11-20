import { Link } from "react-router-dom";
import { ArrowLeft, Star } from "lucide-react";
import { PATHS } from "@/app/router/paths";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { CoinLogo } from "@/components/ui/CoinLogo";
import { PercentChange } from "@/components/ui/PercentChange";
import { useCurrency } from "@/hooks/useCurrency";
import type { CoinDetail } from "@/types/market";

interface CoinHeaderProps {
  coin: CoinDetail;
  watched: boolean;
  onToggleWatch: () => void;
}

const CHIP = "rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs text-ink-muted";

export function CoinHeader({ coin, watched, onToggleWatch }: CoinHeaderProps) {
  const { format } = useCurrency();

  return (
    <div className="space-y-4">
      <Link
        to={PATHS.markets}
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-cyan"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Markets
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <CoinLogo symbol={coin.symbol} color={coin.color} imageUrl={coin.imageUrl} size={52} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{coin.name}</h1>
              <span className={CHIP}>{coin.symbol}</span>
              {coin.rank !== null && <span className={CHIP}>Rank #{coin.rank}</span>}
              {coin.categories[0] && <span className={CHIP}>{coin.categories[0]}</span>}
            </div>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-3">
              <span className="text-3xl font-semibold tabular-nums tracking-tight">{format(coin.price)}</span>
              <span className="text-sm">
                <PercentChange value={coin.priceChange["24H"]} />
                <span className="ml-1.5 text-ink-muted">24h</span>
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" aria-pressed={watched} onClick={onToggleWatch}>
            <Star className={`size-4 ${watched ? "fill-current text-cyan" : ""}`} aria-hidden="true" />
            {watched ? "Watching" : "Add to watchlist"}
          </Button>
          <ButtonLink to={PATHS.portfolioTrade(coin.id)} variant="primary">
            Trade (simulated)
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
