import { Navigate, Outlet, useLocation } from "react-router-dom";
import { PATHS } from "@/app/router/paths";
import { FullScreenLoader } from "@/components/ui/FullScreenLoader";
import { useAuthStore } from "@/stores/auth.store";
import { readFromPath } from "../routeState";

/** Protects the app: waits for session restoration, then redirects guests to /login. */
export function RequireAuth() {
  const status = useAuthStore((state) => state.status);
  const location = useLocation();

  if (status === "idle" || status === "checking") return <FullScreenLoader label="Restoring session" />;
  if (status === "unauthenticated") {
    return (
      <Navigate
        to={PATHS.login}
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }
  return <Outlet />;
}

/** Login and register are only for guests; signed-in users go back where they were headed. */
export function GuestOnly() {
  const status = useAuthStore((state) => state.status);
  const location = useLocation();

  if (status === "idle" || status === "checking") return <FullScreenLoader />;
  if (status === "authenticated") {
    return <Navigate to={readFromPath(location.state) ?? PATHS.overview} replace />;
  }
  return <Outlet />;
}
