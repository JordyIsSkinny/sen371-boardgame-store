import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

const ACCESS_ALGORITHM = 'HS256';
const REFRESH_BYTES = 40;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Access token. Claims are limited to those documented in System Plan 8.2.
 * A JWT is signed but not encrypted, so anything placed here is readable by
 * anyone holding the token; the user record is never spread in wholesale.
 */
export function signAccessToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      role: user.role,
      email: user.email,
    },
    requireEnv('JWT_SECRET'),
    {
      algorithm: ACCESS_ALGORITHM,
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    }
  );
}

/**
 * Throws on any invalid token. The algorithms option is not optional: without
 * it, a token declaring alg "none" would be accepted as valid, letting anyone
 * mint an admin token.
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, requireEnv('JWT_SECRET'), {
    algorithms: [ACCESS_ALGORITHM],
  });
}

/**
 * Refresh tokens are opaque random strings rather than JWTs. A JWT would be
 * self-validating and therefore unrevocable, which defeats logout and the
 * rotation requirement in System Plan 8.2.
 */
export function generateRefreshToken() {
  return crypto.randomBytes(REFRESH_BYTES).toString('hex');
}

/**
 * Stored in refresh_tokens.token_hash. HMAC rather than a plain digest so that
 * read access to the database alone is not enough to look up or forge a token
 * without also holding REFRESH_TOKEN_SECRET.
 *
 * SHA-256 is appropriate here, unlike for passwords: the input is 320 bits of
 * cryptographic randomness, so there is no dictionary to attack and bcrypt's
 * deliberate slowness would only cost latency on every refresh.
 */
export function hashRefreshToken(token) {
  return crypto
    .createHmac('sha256', requireEnv('REFRESH_TOKEN_SECRET'))
    .update(token)
    .digest('hex');
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function refreshTokenExpiry(now = new Date()) {
  const days = parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN ?? '7d', 10) || 7;
  return new Date(now.getTime() + days * DAY_MS);
}
