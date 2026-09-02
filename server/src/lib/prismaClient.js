import { PrismaClient } from "@prisma/client";
import { isProduction } from "../config/index.js";

// Singleton pattern, justified in Milestone 1: Neon caps simultaneous
// connections, so every module that needs the database imports this one
// instance rather than constructing its own PrismaClient. In dev, Node's
// --watch restarts the process on every file save, which would otherwise
// spin up a fresh client (and a fresh connection pool) each time; stashing
// it on globalThis survives that reload.
//
// Note: Prisma reads DATABASE_URL directly from process.env via the
// datasource block in schema.prisma, not through our config module.

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProduction ? ["error", "warn"] : ["error", "warn", "query"],
  });

if (!isProduction) {
  globalForPrisma.prisma = prisma;
}
