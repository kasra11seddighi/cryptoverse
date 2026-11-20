import { ChartPie, TriangleAlert } from "lucide-react";
import { AllocationChart } from "@/components/charts/AllocationChart";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatePanel } from "@/components/ui/StatePanel";
import { useCurrency } from "@/hooks/useCurrency";
import { usePortfolioDetails } from "../hooks";

export function AllocationCard() {
  const { format, formatCompact } = useCurrency();
  const query = usePortfolioDetails();
  const slices = query.data?.allocation ?? [];
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const partial = query.data !== undefined && !query.data.valuation.complete;

  return (
    <Card>
      <CardHeader title="Asset allocation" description={partial ? "Excludes assets without a live price" : "Share of total value, cash included"} />
      <div className="p-4 sm:p-5">
        {query.isPending ? (
          <div role="status" aria-label="Loading allocation" className="flex items-center gap-5">
            <Skeleton className="size-48 shrink-0 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ) : query.isError ? (
          <StatePanel
            tone="error"
            icon={TriangleAlert}
            title="Allocation could not be loaded"
            action={
              <Button variant="secondary" onClick={() => void query.refetch()}>
                Retry
              </Button>
            }
          />
        ) : slices.length === 0 ? (
          <StatePanel icon={ChartPie} title="Nothing to allocate yet" description="Your allocation appears once you hold cash or assets." />
        ) : (
          <AllocationChart slices={slices} formatValue={format} centerLabel={partial ? "Priced value only" : "Total value"} centerValue={formatCompact(total)} />
        )}
      </div>
    </Card>
  );
}
