import { useEffect } from "react";
import { restoreSession } from "@/features/auth/session";
import { useAuthStore } from "@/stores/auth.store";

/** Triggers session restoration once, on application startup. Renders nothing. */
export function AuthBootstrap() {
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    if (status === "idle") void restoreSession();
  }, [status]);

  return null;
}
