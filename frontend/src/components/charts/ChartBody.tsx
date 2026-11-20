import type { ReactNode } from "react";
import { ChartLine, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatePanel } from "@/components/ui/StatePanel";

export type ChartStatus = "loading" | "error" | "empty" | "ready";

interface ChartBodyProps {
  status: ChartStatus;
  onRetry: () => void;
  emptyTitle: string;
  emptyDescription: string;
  children: ReactNode;
}

const SIZE = "h-64 sm:h-80";

/** Gives every chart the same fixed-height frame and the same loading, error and empty states. */
export function ChartBody({ status, onRetry, emptyTitle, emptyDescription, children }: ChartBodyProps) {
  if (status === "loading") {
    return <div role="status" aria-label="Loading chart" className={`${SIZE} animate-pulse rounded-lg bg-surface-2/50`} />;
  }

  if (status === "error") {
    return (
      <div className={SIZE}>
        <StatePanel
          tone="error"
          icon={TriangleAlert}
          title="Chart data could not be loaded"
          description="Check your connection and try again."
          action={
            <Button variant="secondary" onClick={onRetry}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  if (status === "empty") {
    return (
      <div className={SIZE}>
        <StatePanel icon={ChartLine} title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return <div className={SIZE}>{children}</div>;
}
