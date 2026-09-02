import { describe, it, expect, vi } from 'vitest';
import { authorize } from './authorize.js';

const mockRes = () => ({});

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

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ status: 403, error: 'FORBIDDEN' })
    );
  });

  it('rejects with 401 rather than 403 when req.user is absent', () => {
    const next = vi.fn();
    authorize('admin')({}, mockRes(), next);

    // Means authenticate was not applied ahead of this middleware. 401 is
    // correct: we do not know who the caller is, so we cannot say they are
    // forbidden.
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ status: 401 })
    );
  });

  it('rejects everyone when called with no roles', () => {
    const next = vi.fn();
    authorize()({ user: { id: 1, role: 'admin' } }, mockRes(), next);

    // Fails closed. An empty role list is almost certainly a mistake, and
    // defaulting to "allow" would silently open an endpoint.
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ status: 403 })
    );
  });

  it('is case sensitive on role names', () => {
    const next = vi.fn();
    authorize('admin')({ user: { id: 1, role: 'Admin' } }, mockRes(), next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ status: 403 })
    );
  });

  it('returns a fresh middleware each call, with no shared state', () => {
    const adminOnly = authorize('admin');
    const customerOnly = authorize('customer');

    const next1 = vi.fn();
    const next2 = vi.fn();

    adminOnly({ user: { role: 'admin' } }, mockRes(), next1);
    customerOnly({ user: { role: 'admin' } }, mockRes(), next2);

    expect(next1).toHaveBeenCalledWith();
    expect(next2).toHaveBeenCalledWith(
      expect.objectContaining({ status: 403 })
    );
  });
});
