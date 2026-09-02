// Central config module. Nothing else in the codebase should call
// process.env directly, everything reads from here. That's what makes it
// possible to swap or mock config in tests without touching real env vars.

const required = (name) => {
  const value = process.env[name];
  if (!value) {
    // Fail fast and loud at boot rather than surfacing a confusing error
    // three layers deep the first time a route touches this value.
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const config = {
  env: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),

  databaseUrl: required("DATABASE_URL"),

  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",

  jwt: {
    // D owns the actual signing/verification logic (Tuesday). This section
    // exists now so the app boots and so D has an agreed shape to read from
    // rather than inventing config access patterns mid-implementation.
    secret: process.env.JWT_SECRET ?? "dev-secret-replace-me",
    refreshSecret: process.env.REFRESH_TOKEN_SECRET ?? "dev-refresh-secret-replace-me",
    expiresIn: process.env.JWT_EXPIRES_IN ?? "15m",
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN ?? "7d",
  },
};

export const isProduction = config.env === "production";
