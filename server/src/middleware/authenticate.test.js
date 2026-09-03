import { describe, it, expect, vi, beforeAll } from 'vitest';
import jwt from 'jsonwebtoken';
import { authenticate } from './authenticate.js';
import { signAccessToken } from '../services/token.service.js';
import AppError from '../errors/app-error.js';
import UnauthorizedError from '../errors/unauthorized-error.js';

const USER = { id: 1, role: 'customer', email: 'jane@example.com' };

beforeAll(() => {
  process.env.JWT_SECRET ??= 'test-access-secret';
  process.env.REFRESH_TOKEN_SECRET ??= 'test-refresh-secret';
  process.env.JWT_EXPIRES_IN ??= '15m';
});

function mockReq(authorization) {
  return { headers: authorization ? { authorization } : {} };
}

const mockRes = () => ({});

/** The error passed to next() by the middleware under test. */
const errorFrom = (next) => next.mock.calls[0][0];

describe('authenticate', () => {
  it('attaches id, role and email to req.user for a valid token', () => {
    const req = mockReq(`Bearer ${signAccessToken(USER)}`);
    const next = vi.fn();

    authenticate(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({
      id: 1,
      role: 'customer',
      email: 'jane@example.com',
    });
  });

  it('converts the sub claim back to a number', () => {
    const req = mockReq(`Bearer ${signAccessToken(USER)}`);
    authenticate(req, mockRes(), vi.fn());

    // sub is a string in the JWT spec, but every id in our schema is an
    // integer, so services comparing item.userId !== req.user.id would
    // silently fail on a string.
    expect(req.user.id).toBe(1);
    expect(typeof req.user.id).toBe('number');
  });

  it('rejects a request with no Authorization header', () => {
    const next = vi.fn();
    authenticate(mockReq(), mockRes(), next);

    expect(errorFrom(next)).toBeInstanceOf(UnauthorizedError);
    expect(errorFrom(next)).toMatchObject({
      status: 401,
      error: 'UNAUTHORIZED',
    });
  });

  it('rejects a header that is not a Bearer scheme', () => {
    const next = vi.fn();
    authenticate(mockReq('Basic abc123'), mockRes(), next);

    expect(errorFrom(next)).toBeInstanceOf(UnauthorizedError);
    expect(errorFrom(next)).toMatchObject({ status: 401 });
  });

  it('rejects a Bearer header with no token', () => {
    const next = vi.fn();
    authenticate(mockReq('Bearer '), mockRes(), next);

    expect(errorFrom(next)).toBeInstanceOf(UnauthorizedError);
    expect(errorFrom(next)).toMatchObject({ status: 401 });
  });

  it('rejects a token signed with a different secret', () => {
    const forged = jwt.sign({ sub: '1', role: 'admin' }, 'attacker-secret');
    const next = vi.fn();

    authenticate(mockReq(`Bearer ${forged}`), mockRes(), next);

    expect(errorFrom(next)).toBeInstanceOf(UnauthorizedError);
    expect(errorFrom(next)).toMatchObject({
      status: 401,
      error: 'UNAUTHORIZED',
    });
  });

  it('rejects a token using the none algorithm', () => {
    const unsigned = jwt.sign({ sub: '1', role: 'admin' }, '', {
      algorithm: 'none',
    });
    const next = vi.fn();

    authenticate(mockReq(`Bearer ${unsigned}`), mockRes(), next);

    expect(errorFrom(next)).toBeInstanceOf(UnauthorizedError);
    expect(errorFrom(next)).toMatchObject({ status: 401 });
  });

  it('returns TOKEN_EXPIRED specifically for an expired token', () => {
    const expired = jwt.sign(
      { sub: '1', role: 'customer', email: 'jane@example.com' },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' }
    );
    const next = vi.fn();

    authenticate(mockReq(`Bearer ${expired}`), mockRes(), next);

    // Deliberately AppError rather than UnauthorizedError: that subclass fixes
    // the code to UNAUTHORIZED, and the client needs to tell an expired token
    // (attempt a silent refresh) from an invalid one (send them to login).
    expect(errorFrom(next)).toBeInstanceOf(AppError);
    expect(errorFrom(next)).not.toBeInstanceOf(UnauthorizedError);
    expect(errorFrom(next)).toMatchObject({
      status: 401,
      error: 'TOKEN_EXPIRED',
    });
  });

  it('never leaves req.user set on a rejected request', () => {
    const req = mockReq('Bearer nonsense');
    authenticate(req, mockRes(), vi.fn());

    expect(req.user).toBeUndefined();
  });
});
