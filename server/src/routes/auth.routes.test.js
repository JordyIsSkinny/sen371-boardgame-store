import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import { signAccessToken } from "../services/token.service.js";
import AppError from "../errors/app-error.js";

// The controller imports the wired singleton `authService` from
// auth.container.js, not named exports from auth.service.js directly, so
// that's the module that has to be mocked to intercept the service layer —
// mocking auth.service.js would only affect a fresh createAuthService()
// call, not the instance the controller already holds.
const { authService } = await import("../services/auth.container.js");

vi.mock("../services/auth.container.js", () => ({
  authService: {
    register: vi.fn(),
    login: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
  },
}));

let app;

const USER = {
  id: 1,
  role: "customer",
  email: "jane@example.com",
};

const authHeader = () => `Bearer ${signAccessToken(USER)}`;

beforeAll(async () => {
  process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
  process.env.JWT_SECRET ??= "test-access-secret";
  process.env.REFRESH_TOKEN_SECRET ??= "test-refresh-secret";
  process.env.CLIENT_ORIGIN ??= "http://localhost:5173";

  const { createApp } = await import("../app.js");
  app = createApp();
});

beforeEach(() => {
  vi.clearAllMocks();
});

// register and login share one credentialLimiter instance (5/min, keyed by
// IP) for the lifetime of this file's single `app`, so the combined count of
// requests to those two routes across every test below is kept to 4 — well
// under the limit — rather than testing express-rate-limit's own threshold,
// which isn't this file's business.

describe("POST /api/v1/auth/register", () => {
  it("registers a user and returns 201 with the access token and user, cookie-ing the refresh token", async () => {
    authService.register.mockResolvedValue({
      user: { id: 1, first_name: "Jane", last_name: "Doe", email: "jane@example.com", role: "customer" },
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });

    const res = await request(app).post("/api/v1/auth/register").send({
      first_name: "Jane",
      last_name: "Doe",
      email: "jane@example.com",
      password: "correct horse battery staple",
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      data: {
        user: { id: 1, first_name: "Jane", last_name: "Doe", email: "jane@example.com", role: "customer" },
        accessToken: "access-token",
      },
    });
    // The refresh token must never appear in the JSON body...
    expect(JSON.stringify(res.body)).not.toContain("refresh-token");
    // ...only as an httpOnly cookie scoped to /api/v1/auth.
    const cookie = res.headers["set-cookie"].find((c) => c.startsWith("refreshToken="));
    expect(cookie).toContain("refresh-token");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Path=/api/v1/auth");

    expect(authService.register).toHaveBeenCalledWith({
      first_name: "Jane",
      last_name: "Doe",
      email: "jane@example.com",
      password: "correct horse battery staple",
    });
  });

  it("passes through a 409 when the service reports the email is already in use", async () => {
    authService.register.mockRejectedValue(
      new AppError(409, "EMAIL_IN_USE", "That email address is already registered")
    );

    const res = await request(app).post("/api/v1/auth/register").send({
      first_name: "Jane",
      last_name: "Doe",
      email: "jane@example.com",
      password: "correct horse battery staple",
    });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      status: 409,
      error: "EMAIL_IN_USE",
      message: "That email address is already registered",
    });
  });
});

describe("POST /api/v1/auth/login", () => {
  it("logs a user in and returns 200 with the access token, cookie-ing the refresh token", async () => {
    authService.login.mockResolvedValue({
      user: { id: 1, first_name: "Jane", last_name: "Doe", email: "jane@example.com", role: "customer" },
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "jane@example.com", password: "correct horse battery staple" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: {
        user: { id: 1, first_name: "Jane", last_name: "Doe", email: "jane@example.com", role: "customer" },
        accessToken: "access-token",
      },
    });
    expect(authService.login).toHaveBeenCalledWith({
      email: "jane@example.com",
      password: "correct horse battery staple",
    });
  });

  it("passes through a 401 for invalid credentials without revealing which field was wrong", async () => {
    authService.login.mockRejectedValue(new AppError(401, "UNAUTHORIZED", "Invalid email or password"));

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "jane@example.com", password: "wrong-password" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      status: 401,
      error: "UNAUTHORIZED",
      message: "Invalid email or password",
    });
  });
});

describe("POST /api/v1/auth/refresh", () => {
  it("rotates the refresh token and returns a new access token", async () => {
    authService.refresh.mockResolvedValue({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
    });

    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", "refreshToken=old-refresh-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { accessToken: "new-access-token" } });
    expect(authService.refresh).toHaveBeenCalledWith("old-refresh-token");

    const cookie = res.headers["set-cookie"].find((c) => c.startsWith("refreshToken="));
    expect(cookie).toContain("new-refresh-token");
  });

  it("passes through a 401 and clears the cookie when the presented token is invalid", async () => {
    authService.refresh.mockRejectedValue(new AppError(401, "UNAUTHORIZED", "Invalid refresh token"));

    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", "refreshToken=stolen-or-expired-token");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      status: 401,
      error: "UNAUTHORIZED",
      message: "Invalid refresh token",
    });

    // clearCookie: an Expires in the past rather than the token being reissued.
    const cookie = res.headers["set-cookie"].find((c) => c.startsWith("refreshToken="));
    expect(cookie).toMatch(/Expires=Thu, 01 Jan 1970/);
  });

  it("calls the service with undefined when no refresh cookie is presented", async () => {
    authService.refresh.mockRejectedValue(new AppError(401, "UNAUTHORIZED", "Invalid refresh token"));

    const res = await request(app).post("/api/v1/auth/refresh");

    expect(res.status).toBe(401);
    expect(authService.refresh).toHaveBeenCalledWith(undefined);
  });
});

describe("POST /api/v1/auth/logout", () => {
  it("requires authentication", async () => {
    const res = await request(app).post("/api/v1/auth/logout");
    expect(res.status).toBe(401);
    expect(authService.logout).not.toHaveBeenCalled();
  });

  it("revokes the presented refresh token, clears the cookie, and returns 204", async () => {
    authService.logout.mockResolvedValue(undefined);

    const res = await request(app)
      .post("/api/v1/auth/logout")
      .set("Authorization", authHeader())
      .set("Cookie", "refreshToken=some-refresh-token");

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
    expect(authService.logout).toHaveBeenCalledWith("some-refresh-token");

    const cookie = res.headers["set-cookie"].find((c) => c.startsWith("refreshToken="));
    expect(cookie).toMatch(/Expires=Thu, 01 Jan 1970/);
  });
});

describe("GET /api/v1/auth/me", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns the identity carried on the caller's access token, with no service call", async () => {
    const res = await request(app).get("/api/v1/auth/me").set("Authorization", authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: { id: USER.id, role: USER.role, email: USER.email },
    });
  });
});