import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiError } from "@/lib/apiError";
import { authService } from "@/services";
import { useAuthStore } from "@/stores/auth.store";
import type { AuthSession, LoginPayload, RegisterPayload } from "@/types/auth";

export function useLoginMutation() {
  return useMutation<AuthSession, ApiError, LoginPayload>({
    mutationFn: async (payload) => {
      const session = await authService.login(payload);
      // Some backends return the user separately; fall back to /users/me if it was not mapped.
      const user = session.user ?? (await authService.getMe().catch(() => null));
      return { ...session, user };
    },
    onSuccess: ({ accessToken, user }) => {
      useAuthStore.getState().setSession(accessToken, user);
    },
  });
}

export function useRegisterMutation() {
  return useMutation<void, ApiError, RegisterPayload>({
    mutationFn: (payload) => authService.register(payload),
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, never, void>({
    mutationFn: async () => {
      try {
        await authService.logout();
      } catch {
        // The local session is cleared regardless; a failed revoke must not trap the user.
      }
    },
    onSettled: () => {
      useAuthStore.getState().clearSession();
      queryClient.clear();
    },
  });
}
