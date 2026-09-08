import 'dotenv/config';

const required = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const config = {
  env: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3000),

  databaseUrl: required("DATABASE_URL"),

  // docs/security-addendum.md section 4: an allowlist, not a single value.
  // M4 needs a developer running the client locally against the deployed API
  // and the deployed GitHub Pages site to both work at once. A wildcard is
  // not an option here: it's incompatible with credentialed requests, and it
  // would let any site call the API with the refresh cookie attached.
  clientOrigins: (process.env.CLIENT_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),

  jwt: {
    // Secrets use required(), same as databaseUrl, not a fallback: a
    // committed placeholder secret means anyone reading this repo could
    // mint themselves a valid token if it ever shipped that way by
    // accident. Only expiresIn/refreshExpiresIn get a default, since
    // those aren't a security boundary.
    secret: required("JWT_SECRET"),
    refreshSecret: required("REFRESH_TOKEN_SECRET"),
    expiresIn: process.env.JWT_EXPIRES_IN ?? "15m",
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN ?? "7d",
  },
};

// System Plan 8.4: the two secrets must differ. If they were the same, a
// leaked or brute-forced refresh token secret would also mint valid access
// tokens, collapsing two independent trust boundaries into one.
if (config.jwt.secret === config.jwt.refreshSecret) {
  throw new Error("JWT_SECRET and REFRESH_TOKEN_SECRET must be different values");
}

export const isProduction = config.env === "production";
