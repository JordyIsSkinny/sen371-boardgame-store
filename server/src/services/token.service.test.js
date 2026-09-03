import { describe, it, expect, beforeAll } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiry,
} from './token.service.js';

const USER = { id: 1, role: 'customer', email: 'jane@example.com' };

beforeAll(() => {
  process.env.JWT_SECRET ??= 'test-access-secret';
  process.env.REFRESH_TOKEN_SECRET ??= 'test-refresh-secret';
  process.env.JWT_EXPIRES_IN ??= '15m';
  process.env.REFRESH_TOKEN_EXPIRES_IN ??= '7d';
});

describe('signAccessToken', () => {
  it('produces a token carrying only the documented claims', () => {
    const decoded = jwt.decode(signAccessToken(USER));
    expect(Object.keys(decoded).sort()).toEqual(
      ['email', 'exp', 'iat', 'role', 'sub'].sort()
    );
  });

  it('sets sub to the user id and role to the user role', () => {
    const decoded = jwt.decode(signAccessToken(USER));
    expect(decoded.sub).toBe('1');
    expect(decoded.role).toBe('customer');
  });

  it('never includes the password hash even if one is passed in', () => {
    const token = signAccessToken({ ...USER, password_hash: '$2b$12$abc' });
    expect(jwt.decode(token)).not.toHaveProperty('password_hash');
  });

  it('expires 15 minutes after issue', () => {
    const decoded = jwt.decode(signAccessToken(USER));
    expect(decoded.exp - decoded.iat).toBe(15 * 60);
  });

  it('signs with HS256', () => {
    const header = jwt.decode(signAccessToken(USER), { complete: true }).header;
    expect(header.alg).toBe('HS256');
  });
});

describe('verifyAccessToken', () => {
  it('returns the payload for a valid token', () => {
    const payload = verifyAccessToken(signAccessToken(USER));
    expect(payload.sub).toBe('1');
  });

  it('rejects a token signed with a different secret', () => {
    const forged = jwt.sign({ sub: '1', role: 'admin' }, 'wrong-secret');
    expect(() => verifyAccessToken(forged)).toThrow();
  });

  it('rejects an expired token', () => {
    const expired = jwt.sign({ sub: '1' }, process.env.JWT_SECRET, {
      expiresIn: '-1s',
    });
    expect(() => verifyAccessToken(expired)).toThrow();
  });

  it('rejects a token using the "none" algorithm', () => {
    const unsigned = jwt.sign({ sub: '1', role: 'admin' }, '', {
      algorithm: 'none',
    });
    expect(() => verifyAccessToken(unsigned)).toThrow();
  });

  it('rejects malformed input', () => {
    expect(() => verifyAccessToken('not-a-token')).toThrow();
    expect(() => verifyAccessToken('')).toThrow();
  });
});

describe('generateRefreshToken', () => {
  it('returns a long random hex string', () => {
    expect(generateRefreshToken()).toMatch(/^[0-9a-f]{80}$/);
  });

  it('never repeats across many calls', () => {
    const tokens = new Set(
      Array.from({ length: 500 }, () => generateRefreshToken())
    );
    expect(tokens.size).toBe(500);
  });
});

describe('hashRefreshToken', () => {
  it('does not return the token itself', () => {
    const token = generateRefreshToken();
    expect(hashRefreshToken(token)).not.toBe(token);
  });

  it('is deterministic, so a presented token can be looked up', () => {
    const token = generateRefreshToken();
    expect(hashRefreshToken(token)).toBe(hashRefreshToken(token));
  });

  it('produces different hashes for different tokens', () => {
    expect(hashRefreshToken(generateRefreshToken())).not.toBe(
      hashRefreshToken(generateRefreshToken())
    );
  });

  it('returns a 64-character hex digest', () => {
    expect(hashRefreshToken(generateRefreshToken())).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('refreshTokenExpiry', () => {
  it('returns a date 7 days from the given time', () => {
    const now = new Date('2026-09-01T12:00:00Z');
    expect(refreshTokenExpiry(now).toISOString()).toBe(
      '2026-09-08T12:00:00.000Z'
    );
  });

  it('returns a future date when called with no argument', () => {
    expect(refreshTokenExpiry().getTime()).toBeGreaterThan(Date.now());
  });
});
