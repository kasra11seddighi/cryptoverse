import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Shown inside the app shell when a page fails to load or render. */
export function RouteErrorPage() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "An unexpected error occurred.";

  return (
    <div role="alert" className="mx-auto mt-16 max-w-md text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-loss/10 text-loss">
        <TriangleAlert className="size-6" aria-hidden="true" />
      </span>
      <h1 className="mt-4 text-lg font-semibold">This page could not be loaded</h1>
      <p className="mt-1 text-sm text-ink-muted">{message}</p>
      <div className="mt-5">
        <Button onClick={() => window.location.reload()}>Reload page</Button>
      </div>
    </div>
  );
}
