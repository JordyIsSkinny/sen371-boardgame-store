import { prisma } from "../lib/prismaClient.js";

/**
 * Proves the database is actually reachable, which is the one thing a
 * hardcoded 200 cannot tell you. A `SELECT 1` is deliberate: it exercises
 * connection, authentication and query execution without depending on any
 * table existing, so it keeps working through a migration that is still
 * mid-flight.
 *
 * Resolves on success and rejects on failure rather than returning a boolean
 * — translating "unreachable" into a reported state is the service's job, not
 * the repository's.
 */
export async function checkDatabaseConnection() {
  await prisma.$queryRaw`SELECT 1`;
}
