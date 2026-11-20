import { ArrowLeftRight, SearchX, TriangleAlert } from "lucide-react";
import { PATHS } from "@/app/router/paths";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { SimulatedBadge } from "@/components/ui/SimulatedBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/ui/StatCard";
import { StatePanel } from "@/components/ui/StatePanel";
import { useCurrency } from "@/hooks/useCurrency";
import { TransactionFilters } from "../components/TransactionFilters";
import { TransactionsTable } from "../components/TransactionsTable";
import { useTransactionsView } from "../hooks";

export function TransactionsPage() {
  const view = useTransactionsView();
  const { format, formatSigned } = useCurrency();
  const { result, totals, query } = view;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        description="Every simulated buy and sell made in your portfolio."
        actions={<SimulatedBadge />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Completed transactions" value={String(totals.completedCount)} />
        <StatCard label="Total bought" value={format(totals.bought)} />
        <StatCard label="Total sold" value={format(totals.sold)} />
        <StatCard
          label="Realised profit / loss"
          value={formatSigned(totals.realizedPnl)}
          trend={Math.abs(totals.realizedPnl) < 0.005 ? "neutral" : totals.realizedPnl > 0 ? "positive" : "negative"}
          hint="from closed sells"
        />
      </div>

      <Card>
        {result === undefined ? (
          query.isError ? (
            <StatePanel
              tone="error"
              icon={TriangleAlert}
              title="Transactions unavailable"
              description="Your transactions could not be loaded."
              action={
                <Button variant="secondary" onClick={() => void query.refetch()}>
                  Retry
                </Button>
              }
            />
          ) : (
            <div role="status" aria-label="Loading transactions" className="space-y-2 p-4 sm:p-5">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="h-11 w-full" />
              ))}
            </div>
          )
        ) : view.isEmpty ? (
          <StatePanel
            icon={ArrowLeftRight}
            title="No transactions yet"
            description="Your simulated trades will be listed here."
            action={<ButtonLink to={PATHS.portfolio}>Make a simulated trade</ButtonLink>}
          />
        ) : (
          <>
            <TransactionFilters
              filters={view.filters}
              onChange={view.changeFilters}
              onClear={view.clearFilters}
              isFiltered={view.isFiltered}
            />
            {result.total === 0 ? (
              <StatePanel
                icon={SearchX}
                title="No transactions match your filters"
                action={
                  <Button variant="secondary" onClick={view.clearFilters}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <>
                <TransactionsTable transactions={result.items} sort={view.sort} onSortChange={view.toggleSort} />
                <Pagination
                  page={result.page}
                  totalPages={result.totalPages}
                  total={result.total}
                  pageSize={result.pageSize}
                  onPageChange={view.changePage}
                />
              </>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
