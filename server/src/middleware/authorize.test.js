import { describe, it, expect, vi } from 'vitest';
import { authorize } from './authorize.js';
import UnauthorizedError from '../errors/unauthorized-error.js';
import ForbiddenError from '../errors/forbidden-error.js';

const mockRes = () => ({});

/** The error passed to next() by the middleware under test. */
const errorFrom = (next) => next.mock.calls[0][0];

describe('authorize', () => {
  it('allows a user whose role is in the list', () => {
    const req = { user: { id: 1, role: 'admin' } };
    const next = vi.fn();

    authorize('admin')(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it('allows any one of several permitted roles', () => {
    const next = vi.fn();
    authorize('customer', 'admin')(
      { user: { id: 1, role: 'customer' } },
      mockRes(),
      next
    );

    expect(next).toHaveBeenCalledWith();
  });

  it('rejects a role not in the list with 403', () => {
    const next = vi.fn();
    authorize('admin')({ user: { id: 1, role: 'customer' } }, mockRes(), next);

    expect(errorFrom(next)).toBeInstanceOf(ForbiddenError);
    expect(errorFrom(next)).toMatchObject({ status: 403, error: 'FORBIDDEN' });
  });

  it('rejects with 401 rather than 403 when req.user is absent', () => {
    const next = vi.fn();
    authorize('admin')({}, mockRes(), next);

    // Means authenticate was not applied ahead of this middleware. 401 is
    // correct: we do not know who the caller is, so we cannot say they are
    // forbidden.
    expect(errorFrom(next)).toBeInstanceOf(UnauthorizedError);
    expect(errorFrom(next)).toMatchObject({
      status: 401,
      error: 'UNAUTHORIZED',
    });
  });

  it('rejects everyone when called with no roles', () => {
    const next = vi.fn();
    authorize()({ user: { id: 1, role: 'admin' } }, mockRes(), next);

    // Fails closed. An empty role list is almost certainly a mistake, and
    // defaulting to "allow" would silently open an endpoint.
    expect(errorFrom(next)).toBeInstanceOf(ForbiddenError);
    expect(errorFrom(next)).toMatchObject({ status: 403, error: 'FORBIDDEN' });
  });

  it('is case sensitive on role names', () => {
    const next = vi.fn();
    authorize('admin')({ user: { id: 1, role: 'Admin' } }, mockRes(), next);

    expect(errorFrom(next)).toBeInstanceOf(ForbiddenError);
    expect(errorFrom(next)).toMatchObject({ status: 403 });
  });

  it('returns a fresh middleware each call, with no shared state', () => {
    const adminOnly = authorize('admin');
    const customerOnly = authorize('customer');

    const next1 = vi.fn();
    const next2 = vi.fn();

    adminOnly({ user: { role: 'admin' } }, mockRes(), next1);
    customerOnly({ user: { role: 'admin' } }, mockRes(), next2);

    expect(next1).toHaveBeenCalledWith();
    expect(errorFrom(next2)).toBeInstanceOf(ForbiddenError);
    expect(errorFrom(next2)).toMatchObject({ status: 403 });
  });
});
