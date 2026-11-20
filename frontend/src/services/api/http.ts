import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import { env } from "@/lib/env";
import { useAuthStore } from "@/stores/auth.store";
import { mapAuthResponse } from "./auth.mapper";

const REFRESH_PATH = "/auth/refresh";
const AUTH_PATHS = ["/auth/login", "/auth/refresh", "/auth/logout", "/users/register"];

type RetriableRequest = InternalAxiosRequestConfig & { _retry?: boolean };

const baseConfig = {
  baseURL: env.apiBaseUrl,
  // Required so the browser sends/accepts the HttpOnly refresh-token cookie.
  withCredentials: true,
  timeout: 15_000,
  headers: { Accept: "application/json" },
};

export const http = axios.create(baseConfig);

/** Separate instance without interceptors, so refreshing can never loop. */
const refreshClient = axios.create(baseConfig);

let refreshPromise: Promise<string> | null = null;

/**
 * Exchanges the HttpOnly refresh cookie for a new access token.
 * Concurrent callers share one request, which matters with refresh-token rotation:
 * a second parallel refresh would send an already-rotated cookie and fail.
 */
export function refreshAccessToken(): Promise<string> {
  refreshPromise ??= refreshClient
    .post<unknown>(REFRESH_PATH)
    .then((response) => {
      const { accessToken, user } = mapAuthResponse(response.data);
      if (!accessToken) throw new Error("Refresh response did not contain an access token.");
      useAuthStore.getState().setSession(accessToken, user);
      return accessToken;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

function isAuthPath(url: string | undefined): boolean {
  return url !== undefined && AUTH_PATHS.some((path) => url.includes(path));
}

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) throw error;

    const original = error.config as RetriableRequest | undefined;
    const shouldRefresh =
      error.response?.status === 401 &&
      original !== undefined &&
      !original._retry &&
      !isAuthPath(original.url);

    if (!shouldRefresh) throw error;

    original._retry = true;
    try {
      const token = await refreshAccessToken();
      original.headers.set("Authorization", `Bearer ${token}`);
      return await http(original);
    } catch {
      useAuthStore.getState().clearSession();
      throw error;
    }
  },
);
