import { Link } from "react-router-dom";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { PATHS } from "@/app/router/paths";
import { SortableHeader } from "@/components/ui/SortableHeader";
import { useCurrency } from "@/hooks/useCurrency";
import type { Transaction, TransactionStatus } from "@/types/portfolio";
import { formatDateTime, formatQuantity } from "@/utils/format";
import type { TransactionSort, TransactionSortKey } from "../query";

interface TransactionsTableProps {
  transactions: readonly Transaction[];
  sort: TransactionSort;
  onSortChange: (key: TransactionSortKey) => void;
}

const STATUS_STYLE: Record<TransactionStatus, string> = {
  completed: "text-gain",
  pending: "text-ink-muted",
  failed: "text-loss",
};

function SideBadge({ side }: { side: Transaction["side"] }) {
  const Icon = side === "buy" ? ArrowDownLeft : ArrowUpRight;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${side === "buy" ? "bg-accent/15 text-cyan" : "bg-surface-2 text-ink"}`}
    >
      <Icon className="size-3" aria-hidden="true" />
      {side === "buy" ? "Buy" : "Sell"}
    </span>
  );
}

function StatusLabel({ status }: { status: TransactionStatus }) {
  return <span className={`text-xs font-medium capitalize ${STATUS_STYLE[status]}`}>{status}</span>;
}

function RealizedPnl({ tx }: { tx: Transaction }) {
  const { formatSigned } = useCurrency();
  if (tx.realizedPnl === null || tx.status !== "completed") return <span className="text-ink-muted">—</span>;
  return <span className={`tabular-nums ${tx.realizedPnl < 0 ? "text-loss" : "text-gain"}`}>{formatSigned(tx.realizedPnl)}</span>;
}

export function TransactionsTable({ transactions, sort, onSortChange }: TransactionsTableProps) {
  const { format } = useCurrency();

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">Simulated transactions</caption>
          <thead>
            <tr className="text-xs text-ink-muted">
              <SortableHeader label="Date" sortKey="date" sort={sort} onSortChange={onSortChange} className="pl-4 sm:pl-5" />
              <th scope="col" className="px-4 py-3 text-left font-medium">Type</th>
              <SortableHeader label="Asset" sortKey="coin" sort={sort} onSortChange={onSortChange} />
              <SortableHeader label="Quantity" sortKey="quantity" sort={sort} onSortChange={onSortChange} align="right" />
              <SortableHeader label="Price" sortKey="price" sort={sort} onSortChange={onSortChange} align="right" className="hidden lg:table-cell" />
              <SortableHeader label="Total" sortKey="total" sort={sort} onSortChange={onSortChange} align="right" />
              <th scope="col" className="hidden px-4 py-3 text-right font-medium xl:table-cell">Realised P/L</th>
              <th scope="col" className="py-3 pl-4 pr-4 text-left font-medium sm:pr-5">Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-t border-line transition-colors hover:bg-surface-2/40">
                <td className="whitespace-nowrap py-3 pl-4 text-ink-muted sm:pl-5">{formatDateTime(tx.createdAt)}</td>
                <td className="px-4 py-3"><SideBadge side={tx.side} /></td>
                <td className="px-4 py-3">
                  <Link to={PATHS.coin(tx.coinId)} className="rounded-md font-medium hover:underline focus-visible:outline-2 focus-visible:outline-cyan">
                    {tx.name}
                  </Link>
                  <span className="ml-1.5 text-xs text-ink-muted">{tx.symbol}</span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{formatQuantity(tx.quantity)}</td>
                <td className="hidden px-4 py-3 text-right tabular-nums text-ink-muted lg:table-cell">{format(tx.price)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{format(tx.total)}</td>
                <td className="hidden px-4 py-3 text-right xl:table-cell"><RealizedPnl tx={tx} /></td>
                <td className="py-3 pl-4 pr-4 sm:pr-5"><StatusLabel status={tx.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-line md:hidden" aria-label="Transactions">
        {transactions.map((tx) => (
          <li key={tx.id} className="space-y-1.5 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <SideBadge side={tx.side} />
                <Link to={PATHS.coin(tx.coinId)} className="text-sm font-medium focus-visible:outline-2 focus-visible:outline-cyan">
                  {tx.name}
                </Link>
              </div>
              <span className="text-sm font-medium tabular-nums">{format(tx.total)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs text-ink-muted">
              <span>
                {formatQuantity(tx.quantity)} {tx.symbol} at {format(tx.price)}
              </span>
              <StatusLabel status={tx.status} />
            </div>
            <div className="flex items-center justify-between gap-3 text-xs text-ink-muted">
              <span>{formatDateTime(tx.createdAt)}</span>
              {tx.side === "sell" && (
                <span>
                  P/L <RealizedPnl tx={tx} />
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
