import { createApp } from "./app.js";
import { config } from "./config/index.js";
import { prisma } from "./lib/prismaClient.js";

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`API listening on port ${config.port} (${config.env})`);
});

// Render sends SIGTERM before restarting or scaling down a service. Without
// this, in-flight requests and the Prisma connection pool get killed
// mid-operation instead of closing cleanly.
async function shutdown(signal) {
  console.log(`${signal} received, shutting down gracefully.`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
