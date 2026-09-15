import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

/**
 * The repository is mocked at the module boundary so this file exercises the
 * real route, controller and service against a database that is not there.
 * That is deliberate: the degraded path is the behaviour Render's health
 * check and the uptime monitor actually depend on, and it cannot be
 * reproduced by pointing at a working database.
 */
vi.mock("../repositories/health.repository.js", () => ({
  checkDatabaseConnection: vi.fn(),
}));

let app;
let request;
let healthRepository;

beforeAll(async () => {
  // route-protection.test.js deliberately sends a real, unmocked request to
  // this same /health/ready route (it only asserts that the route is public,
  // not what it returns), and health.container.js wires healthService as a
  // module-level singleton the first time anything imports it. When Vitest
  // reuses a worker across files, a dynamic import() can still resolve
  // through that prior file's cached module graph instead of this file's
  // mocked one, so the singleton here would be built from the real
  // repository rather than the vi.mock below. resetModules() forces a fresh
  // module graph for the import() that follows, so the mock always applies
  // regardless of what ran in this worker before it.
  vi.resetModules();

  // Same reasoning as app.test.js: config/index.js reads these at
  // module-evaluation time, so they have to be in place before app.js is
  // imported. Hence the dynamic imports below rather than static ones.
  process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
  process.env.JWT_SECRET ??= "test-access-secret";
  process.env.REFRESH_TOKEN_SECRET ??= "test-refresh-secret";
  process.env.CLIENT_ORIGIN ??= "http://localhost:5173";

  const [{ createApp }, supertestModule, repositoryModule] = await Promise.all([
    import("../app.js"),
    import("supertest"),
    import("../repositories/health.repository.js"),
  ]);

  request = supertestModule.default;
  healthRepository = repositoryModule;
  app = createApp();
});

beforeEach(() => {
  vi.clearAllMocks();
  healthRepository.checkDatabaseConnection.mockResolvedValue(undefined);
});

describe("GET /api/v1/health", () => {
  it("answers 200 with a machine-readable liveness document", async () => {
    const res = await request(app).get("/api/v1/health");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ok" });
    expect(typeof res.body.uptime).toBe("number");
    expect(typeof res.body.timestamp).toBe("string");
  });

  it("is reachable without a token", async () => {
    const res = await request(app).get("/api/v1/health");

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("stays 200 when the database is unreachable", async () => {
    healthRepository.checkDatabaseConnection.mockRejectedValue(new Error("down"));

    const res = await request(app).get("/api/v1/health");

    // Liveness answers "is this process running", not "can it serve
    // traffic". If it went 503 on a database blip, Render would kill and
    // restart a perfectly healthy instance, and the restart would not fix
    // the database.
    expect(res.status).toBe(200);
  });
});

describe("GET /api/v1/health/ready", () => {
  it("answers 200 and reports the database as connected when it responds", async () => {
    const res = await request(app).get("/api/v1/health/ready");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ok", database: "connected" });
    expect(healthRepository.checkDatabaseConnection).toHaveBeenCalledTimes(1);
  });

  it("answers 503 when the database is unreachable", async () => {
    healthRepository.checkDatabaseConnection.mockRejectedValue(
      new Error("connection refused"),
    );

    const res = await request(app).get("/api/v1/health/ready");

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: "degraded", database: "disconnected" });
  });

  it("does not route a failed database check through the error handler", async () => {
    healthRepository.checkDatabaseConnection.mockRejectedValue(new Error("down"));

    const res = await request(app).get("/api/v1/health/ready");

    // An unreachable database is a reportable state for this endpoint, not a
    // thrown error, so the body is the health document rather than the
    // System Plan 8.3 error envelope. Asserting the absence of "error" is
    // what pins that distinction down.
    expect(res.body).not.toHaveProperty("error");
    expect(res.status).not.toBe(500);
  });

  it("is reachable without a token", async () => {
    const res = await request(app).get("/api/v1/health/ready");

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});
