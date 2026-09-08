import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./config/index.js";
import routes from "./routes/index.js";
import { notFound } from "./middleware/notFound.js";
import errorHandler from "./middleware/error-handler.js";
import { serializeResponse } from "./middleware/serialize-response.js";
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
      // A function, not the allowlist directly: cors() reflects the caller's
      // own Origin header back when this returns true, which is what
      // credentialed cross-origin requests require — the alternative,
      // handing it the array or "*", either can't combine with
      // credentials: true or would accept every origin.
      origin: (origin, callback) => {
        if (!origin || config.clientOrigins.includes(origin)) {
          return callback(null, true);
        }
        // Not an error: an unlisted origin should get no CORS headers so
        // the browser blocks the response client-side, not a 500 that
        // hands a probing client information about why it failed.
        return callback(null, false);
      },
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

  app.use(serializeResponse);
  
  app.use("/api/v1", routes);

  // Must come after all route mounts: catches anything nothing above matched.
  app.use(notFound);

  // Must be last: Express identifies error-handling middleware by arity
  // (four parameters), and only calls it via next(err).
  app.use(errorHandler);

  return app;
}
