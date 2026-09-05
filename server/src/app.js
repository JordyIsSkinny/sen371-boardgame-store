import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./config/index.js";
import routes from "./routes/index.js";
import { notFound } from "./middleware/notFound.js";
import errorHandler from "./middleware/error-handler.js";
import cookieParser from "cookie-parser";

// This file is the architecture: it's the middleware chain from Milestone
// 1's diagram (Figure 2, Section 7) made real. Helmet -> CORS -> general
// rate limit -> cookie parsing -> body parsing -> routes (which apply
// auth/RBAC/validation and their own stricter rate limits per-router as
// needed) -> notFound -> errorHandler. Nothing else should register
// middleware outside this file; that's what keeps the chain legible in one
// place.

export function createApp() {
  const app = express();

  // System Plan 8.4: security headers with helmet's defaults.
  app.use(helmet());

  app.use(
    cors({
      origin: config.clientOrigin,
      credentials: true,
    }),
  );

  // System Plan 8.4: 100 requests per minute per IP across the whole API.
  // Defined per createApp() call, not at module scope, so each app instance
  // (each test that builds one included) gets its own counter rather than
  // sharing state with every other app built in the same process.
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 100,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      message: {
        status: 429,
        error: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Try again in a minute.",
      },
    }),
  );

  // Must come before any handler reads req.cookies, e.g. /auth/refresh.
  app.use(cookieParser());

  // System Plan 8.4: JSON body limit of 100kb. Matches express's own
  // default, made explicit so it stays true if that default ever changes.
  app.use(express.json({ limit: "100kb" }));

  app.use("/api/v1", routes);

  // Must come after all route mounts: catches anything nothing above matched.
  app.use(notFound);

  // Must be last: Express identifies error-handling middleware by arity
  // (four parameters), and only calls it via next(err).
  app.use(errorHandler);

  return app;
}
