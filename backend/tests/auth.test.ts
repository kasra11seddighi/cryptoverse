// Tests authentication API routes, validation, JWT middleware, and refresh cookie behavior.

import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { AppError } from "../src/shared/errors/AppError.js";

// Creates shared mocks for authentication and user services.
const mocks = vi.hoisted(() => ({
  registerUser: vi.fn(),
  loginUser: vi.fn(),
  getUserById: vi.fn(),
  refreshSession: vi.fn(),
  revokeSession: vi.fn(),
}));

// Replaces database-dependent services while keeping real Express routes and middleware.
vi.mock("../src/modules/users/user.service.js", () => ({
  registerUser: mocks.registerUser,
  loginUser: mocks.loginUser,
  getUserById: mocks.getUserById,
}));

vi.mock("../src/modules/auth/auth.service.js", () => ({
  refreshSession: mocks.refreshSession,
  revokeSession: mocks.revokeSession,
}));

// Configures isolated test secrets before importing the JWT-dependent application.
process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "test-access-secret-for-cryptoverse";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-for-cryptoverse";

// Imports the real Express application and JWT generator after configuring secrets.
const { default: app } = await import("../src/app.js");
const { generateTokens } = await import("../src/modules/auth/jwt.service.js");

// Defines reusable public user data for API responses.
const testUser = {
  id: "user-123",
  name: "Test User",
  email: "crypto.test@example.com",
  role: "user" as const,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

// Defines valid registration and login payloads.
const validCredentials = {
  name: "Test User",
  email: "crypto.test@example.com",
  password: "TestPassword123!",
};

// Resets mock history and configures successful service responses before each test.
beforeEach(() => {
  vi.clearAllMocks();

  mocks.registerUser.mockResolvedValue(testUser);

  mocks.loginUser.mockResolvedValue({
    accessToken: "test-access-token",
    refreshToken: "test-refresh-token",
    user: testUser,
  });

  mocks.getUserById.mockResolvedValue(testUser);

  mocks.refreshSession.mockResolvedValue({
    accessToken: "rotated-access-token",
    refreshToken: "rotated-refresh-token",
  });

  mocks.revokeSession.mockResolvedValue(undefined);
});

describe("Authentication API", () => {
  // Checks successful user registration.
  it("registers a user with valid data", async () => {
    const response = await request(app)
      .post("/api/v1/users/register")
      .send(validCredentials);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe(validCredentials.email);
    expect(mocks.registerUser).toHaveBeenCalledOnce();
  });

  // Checks that invalid registration data is rejected before reaching the service.
  it("rejects invalid registration data", async () => {
    const response = await request(app)
      .post("/api/v1/users/register")
      .send({
        ...validCredentials,
        email: "invalid-email",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(mocks.registerUser).not.toHaveBeenCalled();
  });

  // Checks duplicate email handling.
  it("rejects duplicate email registration", async () => {
    mocks.registerUser.mockRejectedValueOnce(
      new AppError("An account with this email already exists", 409),
    );

    const response = await request(app)
      .post("/api/v1/users/register")
      .send(validCredentials);

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
  });

  // Checks successful login and HttpOnly refresh cookie creation.
  it("logs in and stores the refresh token in an HttpOnly cookie", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: validCredentials.email,
        password: validCredentials.password,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toBe("test-access-token");
    expect(response.body.data.refreshToken).toBeUndefined();

    const cookies = response.headers["set-cookie"] as string[];

    expect(cookies).toBeDefined();
    expect(cookies.some((cookie) =>
      cookie.includes("cryptoverse_refresh=") &&
      cookie.includes("HttpOnly") &&
      cookie.includes("Path=/api/v1/auth"),
    )).toBe(true);
  });

  // Checks invalid login credentials.
  it("rejects incorrect login credentials", async () => {
    mocks.loginUser.mockRejectedValueOnce(
      new AppError("Invalid email or password", 401),
    );

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: validCredentials.email,
        password: "WrongPassword123!",
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  // Checks that protected profile routes reject unauthenticated requests.
  it("rejects access to the profile without an access token", async () => {
    const response = await request(app)
      .get("/api/v1/users/me");

    expect(response.status).toBe(401);
    expect(mocks.getUserById).not.toHaveBeenCalled();
  });

  // Checks that a valid access token grants access to the profile.
  it("returns the current user's profile with a valid access token", async () => {
    const tokens = generateTokens({
      userId: testUser.id,
      role: "user",
    });

    const response = await request(app)
      .get("/api/v1/users/me")
      .set("Authorization", `Bearer ${tokens.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe(testUser.email);
    expect(mocks.getUserById).toHaveBeenCalledWith(testUser.id);
  });

  // Checks that malformed access tokens are rejected.
  it("rejects an invalid access token", async () => {
    const response = await request(app)
      .get("/api/v1/users/me")
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
    expect(mocks.getUserById).not.toHaveBeenCalled();
  });

  // Checks refresh requests without a cookie.
  it("rejects refresh requests without a refresh cookie", async () => {
    const response = await request(app)
      .post("/api/v1/auth/refresh");

    expect(response.status).toBe(401);
    expect(mocks.refreshSession).not.toHaveBeenCalled();
  });

  // Checks successful refresh token rotation and cookie replacement.
  it("rotates a valid refresh token", async () => {
    const response = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", "cryptoverse_refresh=old-refresh-token");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toBe("rotated-access-token");
    expect(mocks.refreshSession).toHaveBeenCalledWith("old-refresh-token");

    const cookies = response.headers["set-cookie"] as string[];

    expect(cookies.some((cookie) =>
      cookie.includes("cryptoverse_refresh=rotated-refresh-token") &&
      cookie.includes("HttpOnly"),
    )).toBe(true);
  });

  // Checks that a refresh token rejected by the service cannot be reused.
  it("rejects a replayed refresh token", async () => {
    mocks.refreshSession.mockRejectedValueOnce(
      new AppError("Refresh token is invalid or has already been used", 401),
    );

    const response = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", "cryptoverse_refresh=revoked-refresh-token");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  // Checks successful logout and refresh token revocation.
  it("revokes the refresh token during logout", async () => {
    const response = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", "cryptoverse_refresh=current-refresh-token");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mocks.revokeSession).toHaveBeenCalledWith(
      "current-refresh-token",
    );

    const cookies = response.headers["set-cookie"] as string[];

    expect(cookies.some((cookie) =>
      cookie.includes("cryptoverse_refresh="),
    )).toBe(true);
  });

  // Checks that logout without a cookie is handled safely.
  it("allows logout without an existing refresh cookie", async () => {
    const response = await request(app)
      .post("/api/v1/auth/logout");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mocks.revokeSession).not.toHaveBeenCalled();
  });
});
