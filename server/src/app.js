import express from "express";
import cors from "cors";
import { config } from "./config/index.js";
import routes from "./routes/index.js";
import { notFound } from "./middleware/notFound.js";
import errorHandler from "./middleware/error-handler.js";
import cookieParser from 'cookie-parser'

// This file is the architecture: it's the middleware chain from Milestone
// 1's diagram (Figure 2, Section 7) made real. CORS -> body parsing ->
// routes (which apply auth/RBAC/validation per-router as needed) ->
// notFound -> errorHandler. Nothing else should register middleware
// outside this file; that's what keeps the chain legible in one place.

export function createApp() {
  const app = express();
  app.use(cookieParser());

  app.use(
    cors({
      origin: config.clientOrigin,
      credentials: true,
    }),
  );

  app.use(express.json());

  app.use("/api/v1", routes);

  // Must come after all route mounts: catches anything nothing above matched.
  app.use(notFound);

  // Must be last: Express identifies error-handling middleware by arity
  // (four parameters), and only calls it via next(err).
  app.use(errorHandler);

  return app;
}
