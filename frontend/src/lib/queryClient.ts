import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./apiError";

/** One retry for transient failures. Never for rate limits or client errors, which retrying cannot fix. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status !== null && (error.status === 429 || (error.status >= 400 && error.status < 500))) {
    return false;
  }
  return failureCount < 1;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: shouldRetry,
      refetchOnWindowFocus: false,
    },
  },
});
