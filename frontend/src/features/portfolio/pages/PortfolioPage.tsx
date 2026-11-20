import { useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { PoweredByCoinGecko } from "@/components/ui/PoweredByCoinGecko";
import { SimulatedBadge } from "@/components/ui/SimulatedBadge";
import { PortfolioSummaryCards } from "@/features/dashboard/components/PortfolioSummaryCards";
import type { TradeSide } from "@/types/portfolio";
import { AllocationCard } from "../components/AllocationCard";
import { HoldingsTable } from "../components/HoldingsTable";
import { TradePanel } from "../components/TradePanel";
import type { TradeRequest } from "../components/TradePanel";

function parseSide(value: string | null): TradeSide | undefined {
  return value === "buy" || value === "sell" ? value : undefined;
}

export function PortfolioPage() {
  const [params] = useSearchParams();
  // `nonce` remounts the trade panel so a "Buy"/"Sell" click preselects its asset and side.
  const [request, setRequest] = useState<TradeRequest & { nonce: number }>(() => ({
    coinId: params.get("coin") ?? undefined,
    side: parseSide(params.get("side")),
    nonce: 0,
  }));
  const panelRef = useRef<HTMLDivElement>(null);

  function openTrade(coinId: string, side: TradeSide) {
    setRequest((current) => ({ coinId, side, nonce: current.nonce + 1 }));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    panelRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portfolio"
        description="Your simulated investments. All balances, trades and profits here are virtual."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SimulatedBadge />
            <PoweredByCoinGecko />
          </div>
        }
      />
      <PortfolioSummaryCards />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <AllocationCard />
          <HoldingsTable onTrade={openTrade} />
        </div>
        <div ref={panelRef} className="scroll-mt-4">
          <TradePanel key={request.nonce} initial={request} />
        </div>
      </div>
    </div>
  );
}
