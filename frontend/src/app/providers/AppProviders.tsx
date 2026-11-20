import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AuthBootstrap } from "./AuthBootstrap";
import { ThemeSync } from "./ThemeSync";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeSync />
      <AuthBootstrap />
      {children}
    </QueryClientProvider>
  );
}
