import { config } from "../config/index.js";

/**
 * Liveness and readiness are two different questions and the deployment
 * depends on them being separate.
 *
 * Liveness answers "is this process running". Render probes it continuously
 * and restarts the instance when it fails, so it must not depend on the
 * database: restarting the API does not repair Neon, it just takes the API
 * down too, and a probe that opened a connection every few seconds would eat
 * into the free tier's connection cap for no extra information.
 *
 * Readiness answers "can it serve traffic", which does require the database.
 * That is the endpoint the uptime monitor watches and the one the deployment
 * workflow polls after a deploy.
 *
 * The repository and the two clocks are injected (the auth.service.js
 * pattern) so the unreachable-database case is unit testable without
 * arranging a real outage.
 */
export function createHealthService({
  healthRepository,
  uptime = () => process.uptime(),
  now = () => new Date(),
}) {
  function baseReport() {
    return {
      // Whole seconds: the fractional part of process.uptime() is noise in a
      // monitoring dashboard, and it makes every logged sample unique for no
      // reason.
      uptime: Math.floor(uptime()),
      timestamp: now().toISOString(),
      environment: config.env,
    };
  }

  async function getLiveness() {
    return { status: "ok", ...baseReport() };
  }

  async function getReadiness() {
    let database = "connected";

    try {
      await healthRepository.checkDatabaseConnection();
    } catch {
      // The error is swallowed on purpose. This endpoint is unauthenticated
      // (see route-protection.test.js), and the driver's message carries the
      // database user name and the reason authentication failed — an
      // anonymous caller gets "disconnected" and nothing more. Render's own
      // logs are where the detail belongs.
      database = "disconnected";
    }

    return {
      status: database === "connected" ? "ok" : "degraded",
      database,
      ...baseReport(),
    };
  }

  return { getLiveness, getReadiness };
}
