/** Fields confirmed by the backend login response. */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  createdAt: string | null;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser | null;
}
