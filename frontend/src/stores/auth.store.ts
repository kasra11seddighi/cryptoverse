import { create } from "zustand";
import type { AuthUser } from "@/types/auth";

export type AuthStatus = "idle" | "checking" | "authenticated" | "unauthenticated";

interface AuthStore {
  status: AuthStatus;
  /** Memory only. Never persisted (no localStorage, sessionStorage or persist middleware). */
  accessToken: string | null;
  user: AuthUser | null;
  setStatus: (status: AuthStatus) => void;
  setSession: (accessToken: string, user?: AuthUser | null) => void;
  setUser: (user: AuthUser) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthStore>()((set) => ({
  status: "idle",
  accessToken: null,
  user: null,
  setStatus: (status) => set({ status }),
  setSession: (accessToken, user) =>
    set((state) => ({
      status: "authenticated",
      accessToken,
      user: user ?? state.user,
    })),
  setUser: (user) => set({ user }),
  clearSession: () => set({ status: "unauthenticated", accessToken: null, user: null }),
}));
