import { createHealthService } from "./health.service.js";
import * as healthRepository from "../repositories/health.repository.js";

/**
 * Single wiring point for the health service, matching auth.container.js:
 * the service takes its repository as an argument so its tests can run
 * against a mock, and this module is the one place the real Prisma-backed
 * implementation is attached.
 */
export const healthService = createHealthService({ healthRepository });
