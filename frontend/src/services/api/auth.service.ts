import { ApiError, toApiError } from "@/lib/apiError";
import type { AuthSession, AuthUser, LoginPayload, RegisterPayload } from "@/types/auth";
import { mapAuthResponse, mapUser } from "./auth.mapper";
import { http } from "./http";

/** Real backend endpoints only: /auth/login, /auth/logout, /users/register, /users/me. */
export const authService = {
  async login(payload: LoginPayload): Promise<AuthSession> {
    try {
      const response = await http.post<unknown>("/auth/login", payload);
      const { accessToken, user } = mapAuthResponse(response.data);
      if (!accessToken) throw new ApiError("The server did not return an access token.");
      return { accessToken, user };
    } catch (error) {
      throw toApiError(error);
    }
  },

  async register(payload: RegisterPayload): Promise<void> {
    try {
      await http.post("/users/register", payload);
    } catch (error) {
      throw toApiError(error);
    }
  },

  async logout(): Promise<void> {
    try {
      await http.post("/auth/logout");
    } catch (error) {
      throw toApiError(error);
    }
  },

  async getMe(): Promise<AuthUser> {
    try {
      const response = await http.get<unknown>("/users/me");
      const user = mapUser(response.data);
      if (!user) throw new ApiError("Could not read the user profile from the server response.");
      return user;
    } catch (error) {
      throw toApiError(error);
    }
  },
};
