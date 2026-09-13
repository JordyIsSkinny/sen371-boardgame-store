import { healthService } from "../services/health.container.js";

export async function getLiveness(req, res, next) {
  try {
    res.json(await healthService.getLiveness());
  } catch (err) {
    next(err);
  }
}

export async function getReadiness(req, res, next) {
  try {
    const report = await healthService.getReadiness();

    // 503 rather than next(err) with a ServiceUnavailableError, and so not
    // the System Plan 8.3 error envelope. A degraded database is a state this
    // endpoint exists to report, not a failure of the request: the caller
    // asked "are you ready" and got a complete, correct answer. Wrapping it
    // as an error would replace the report — uptime, environment, which
    // dependency is down — with a generic message, and the report is the
    // whole value of the endpoint. The status code still carries the signal
    // Render and the uptime monitor act on.
    res.status(report.status === "ok" ? 200 : 503).json(report);
  } catch (err) {
    next(err);
  }
}
