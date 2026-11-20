import { refreshAccessToken } from "@/services/api/http";
import { authService } from "@/services";
import { useAuthStore } from "@/stores/auth.store";

let inflight: Promise<void> | null = null;

/**
 * Restores the session on app start. The refresh token lives in an HttpOnly cookie that
 * JavaScript cannot read, so the only way to know if a session exists is to ask the server.
 *
 * Calls are shared: React StrictMode runs effects twice in development, and with
 * refresh-token rotation a second parallel refresh would send an already-rotated cookie.
 */
export function restoreSession(): Promise<void> {
  inflight ??= (async () => {
    useAuthStore.getState().setStatus("checking");
    try {
      await refreshAccessToken();
      const user = await authService.getMe();
      useAuthStore.getState().setUser(user);
    } catch {
      useAuthStore.getState().clearSession();
    }
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}
