import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { FlaskConical } from "lucide-react";
import { PATHS } from "@/app/router/paths";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { FormAlert } from "@/features/auth/components/FormAlert";
import { useCoins, useCoinsByIds } from "@/features/market/hooks";
import { useCurrency } from "@/hooks/useCurrency";
import type { TradeSide } from "@/types/portfolio";
import { formatQuantity } from "@/utils/format";
import { usePortfolioState, useTradeMutation } from "../hooks";
import { checkTrade, maxBuyQuantity } from "../tradeValidation";

export interface TradeRequest {
  coinId?: string;
  side?: TradeSide;
}

const TOP_COINS = { page: 1, pageSize: 100 } as const;

function toInputText(value: number): string {
  return value.toFixed(8).replace(/\.?0+$/, "") || "0";
}

/** Simulated buy/sell form. Validation is shown live; the server prices the order and is the final authority on submit. */
export function TradePanel({ initial }: { initial: TradeRequest }) {
  const { format } = useCurrency();
  const accountQuery = usePortfolioState();
  const cashBalance = accountQuery.data?.cashBalance ?? 0;
  const holdings = accountQuery.data?.holdings ?? [];
  const tradeMutation = useTradeMutation();
  const topQuery = useCoins(TOP_COINS);

  const [side, setSide] = useState<TradeSide>(initial.side ?? "buy");
  const [coinId, setCoinId] = useState(initial.coinId ?? "bitcoin");
  const [quantityText, setQuantityText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  // Held coins (and the preselected one) are looked up by id, so they work even outside the top list.
  const heldIds = new Set(holdings.map((holding) => holding.coinId));
  const knownIds = [...new Set([...heldIds, ...(initial.coinId ? [initial.coinId] : [])])];
  const knownQuery = useCoinsByIds(knownIds);
  const known = knownQuery.data ?? [];

  const top = topQuery.data?.items ?? [];
  const options =
    side === "sell"
      ? known.filter((item) => heldIds.has(item.id))
      : [...top, ...known.filter((item) => !top.some((topCoin) => topCoin.id === item.id))];
  const optionsLoading = side === "sell" ? knownIds.length > 0 && knownQuery.isPending : topQuery.isPending;
  const optionsFailed = side === "sell" ? knownQuery.isError : topQuery.isError;
  const coin = options.find((item) => item.id === coinId) ?? options[0];

  const heldQuantity = holdings.find((holding) => holding.coinId === coin?.id)?.quantity ?? 0;
  const check = checkTrade({
    side,
    symbol: coin?.symbol ?? "",
    quantityText,
    price: coin?.price ?? 0,
    cashBalance,
    heldQuantity,
  });
  const visibleError = submitted || quantityText !== "" ? check.error : null;
  const canSubmit = coin !== undefined && !optionsLoading && accountQuery.data !== undefined && !tradeMutation.isPending;

  function changeSide(next: TradeSide) {
    setSide(next);
    setSubmitted(false);
    setFeedback(null);
  }

  function fillMax() {
    if (!coin) return;
    setQuantityText(toInputText(side === "buy" ? maxBuyQuantity(cashBalance, coin.price) : heldQuantity));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (!coin || check.error !== null || check.quantity === null) return;

    tradeMutation.mutate(
      { coinId: coin.id, side, quantity: check.quantity },
      {
        onSuccess: ({ transaction }) => {
          // The price shown is the one the server actually used, which can differ slightly from the one on screen.
          setFeedback({
            tone: "success",
            message: `Simulated ${side} completed: ${formatQuantity(transaction.quantity)} ${transaction.symbol} at ${format(transaction.price)} (total ${format(transaction.total)}).`,
          });
          setQuantityText("");
          setSubmitted(false);
        },
        onError: (error) => setFeedback({ tone: "error", message: error.message }),
      },
    );
  }

  return (
    <Card>
      <CardHeader title="Trade" description="Practice buying and selling with virtual funds" />
      <form onSubmit={handleSubmit} noValidate className="space-y-4 p-4 sm:p-5">
        <div className="flex items-start gap-2 rounded-lg border border-cyan/25 bg-cyan/5 px-3 py-2.5 text-xs text-ink-muted">
          <FlaskConical className="mt-0.5 size-3.5 shrink-0 text-cyan" aria-hidden="true" />
          <p>Simulation only. No real money moves and no real order is placed. The simulated order executes at the latest market price when it reaches the server.</p>
        </div>

        <div role="group" aria-label="Order side" className="grid grid-cols-2 rounded-lg border border-line bg-canvas p-0.5">
          {(["buy", "sell"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={side === option}
              onClick={() => changeSide(option)}
              className={`h-9 rounded-md text-sm font-medium capitalize transition-colors focus-visible:outline-2 focus-visible:outline-cyan ${side === option ? "bg-surface-2 text-ink shadow-sm" : "text-ink-muted hover:text-ink"}`}
            >
              {option}
            </button>
          ))}
        </div>

        <SelectField
          label="Asset"
          value={coin?.id ?? ""}
          disabled={options.length === 0}
          onChange={(event) => {
            setCoinId(event.target.value);
            setFeedback(null);
          }}
          options={
            options.length === 0
              ? [{ value: "", label: optionsLoading ? "Loading…" : optionsFailed ? "Prices unavailable" : "No assets to sell" }]
              : options.map((item) => ({ value: item.id, label: `${item.name} (${item.symbol})` }))
          }
        />

        <div>
          <TextField
            label={`Quantity${coin ? ` (${coin.symbol})` : ""}`}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            value={quantityText}
            error={visibleError ?? undefined}
            onChange={(event) => {
              setQuantityText(event.target.value);
              setFeedback(null);
            }}
            trailing={
              <button
                type="button"
                onClick={fillMax}
                disabled={!coin}
                className="rounded-md px-2 py-1 text-xs font-medium text-accent hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-cyan disabled:opacity-50"
              >
                Max
              </button>
            }
          />
        </div>

        <dl className="space-y-1.5 text-sm">
          <Line label="Price" value={coin ? format(coin.price) : "—"} />
          <Line
            label={side === "buy" ? "Available balance" : "You hold"}
            value={side === "buy" ? format(cashBalance) : `${formatQuantity(heldQuantity)} ${coin?.symbol ?? ""}`}
          />
          <Line label={side === "buy" ? "Estimated cost" : "Estimated proceeds"} value={check.quantity !== null ? format(check.total) : "—"} strong />
        </dl>

        {accountQuery.isError && !accountQuery.data && (
          <FormAlert tone="error">Your simulated account could not be loaded. Reload the page to try again.</FormAlert>
        )}
        {feedback && <FormAlert tone={feedback.tone}>{feedback.message}</FormAlert>}

        <Button type="submit" fullWidth disabled={!canSubmit}>
          {tradeMutation.isPending ? "Placing order…" : side === "buy" ? "Place simulated buy" : "Place simulated sell"}
        </Button>

        {feedback?.tone === "success" && (
          <p className="text-center text-sm">
            <Link to={PATHS.transactions} className="font-medium text-accent hover:underline">
              View transactions
            </Link>
          </p>
        )}
      </form>
    </Card>
  );
}

function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={`tabular-nums ${strong ? "font-semibold" : ""}`}>{value}</dd>
    </div>
  );
}
