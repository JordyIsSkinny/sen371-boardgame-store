import { describe, it, expect, vi, beforeEach } from "vitest";

import { createHealthService } from "./health.service.js";

/**
 * The repository is injected (the auth.service.js pattern), so every case
 * below runs with no database at all — including the one that matters most,
 * the database being unreachable, which is not something you can arrange
 * against a real connection on demand.
 */
const makeService = (overrides = {}) => {
  const healthRepository = {
    checkDatabaseConnection: vi.fn().mockResolvedValue(undefined),
  };

  const service = createHealthService({
    healthRepository,
    // Injected so the assertions can be exact rather than approximate. Real
    // process.uptime() and Date.now() would force every expectation here
    // into a range check.
    uptime: () => 42.7,
    now: () => new Date("2026-09-13T10:30:00.000Z"),
    ...overrides,
  });

  return { service, healthRepository };
};

describe("health.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getLiveness", () => {
    it("reports the process as up without touching the database", async () => {
      const { service, healthRepository } = makeService();

      const result = await service.getLiveness();

      expect(result).toMatchObject({
        status: "ok",
        uptime: 42,
        timestamp: "2026-09-13T10:30:00.000Z",
      });
      // The whole point of splitting liveness from readiness: Render probes
      // this one every few seconds, and a probe that opens a database
      // connection each time would burn the Neon connection cap for no
      // information a readiness check does not already give.
      expect(healthRepository.checkDatabaseConnection).not.toHaveBeenCalled();
    });

    it("truncates fractional uptime seconds", async () => {
      const { service } = makeService({ uptime: () => 0.9 });

      await expect(service.getLiveness()).resolves.toMatchObject({ uptime: 0 });
    });
  });

  describe("getReadiness", () => {
    it("reports ready when the database answers", async () => {
      const { service, healthRepository } = makeService();

      const result = await service.getReadiness();

      expect(result).toMatchObject({
        status: "ok",
        database: "connected",
        uptime: 42,
        timestamp: "2026-09-13T10:30:00.000Z",
      });
      expect(healthRepository.checkDatabaseConnection).toHaveBeenCalledTimes(1);
    });

    it("reports degraded when the database query rejects", async () => {
      const { service, healthRepository } = makeService();
      healthRepository.checkDatabaseConnection.mockRejectedValue(
        new Error("connection refused"),
      );

      const result = await service.getReadiness();

      expect(result).toMatchObject({
        status: "degraded",
        database: "disconnected",
      });
    });

    it("does not leak the underlying driver error into the response body", async () => {
      const { service, healthRepository } = makeService();
      healthRepository.checkDatabaseConnection.mockRejectedValue(
        new Error("password authentication failed for user \"neondb_owner\""),
      );

      const result = await service.getReadiness();

      // A health endpoint is unauthenticated by design (see the PUBLIC entry
      // in route-protection.test.js). Echoing the driver's message would
      // hand an anonymous caller the database user name and the reason the
      // connection failed.
      expect(JSON.stringify(result)).not.toContain("neondb_owner");
      expect(JSON.stringify(result)).not.toContain("password");
    });

    it("still reports uptime and environment when degraded", async () => {
      const { service, healthRepository } = makeService();
      healthRepository.checkDatabaseConnection.mockRejectedValue(new Error("down"));

      const result = await service.getReadiness();

      // The monitor's alert is more useful with this: a small uptime next to
      // a degraded status says the instance is still cold-starting, a large
      // one says the database went away under a running instance.
      expect(result.uptime).toBe(42);
      expect(result).toHaveProperty("environment");
    });
  });
});
