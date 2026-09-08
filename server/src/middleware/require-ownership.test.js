import { describe, it, expect, vi } from 'vitest';
import { requireOwnershipOrAdmin } from './require-ownership.js';
import NotFoundError from '../errors/not-found-error.js';
import UnauthorizedError from '../errors/unauthorized-error.js';

const mockRes = () => ({});
const errorFrom = (next) => next.mock.calls[0][0];

const OWNER = { id: 7, role: 'customer' };
const OTHER = { id: 99, role: 'customer' };
const ADMIN = { id: 1, role: 'admin' };

const ORDER = { id: 42, userId: 7, total: 599.99 };

/** Loader that resolves to ORDER, standing in for a repository call. */
const loadsOrder = () => vi.fn().mockResolvedValue(ORDER);
const loadsNothing = () => vi.fn().mockResolvedValue(null);

describe('requireOwnershipOrAdmin', () => {
  it('passes the owner through', async () => {
    const next = vi.fn();
    const mw = requireOwnershipOrAdmin({ load: loadsOrder() });

    await mw({ user: OWNER, params: { id: '42' } }, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it('attaches the loaded resource to the request', async () => {
    const req = { user: OWNER, params: { id: '42' } };
    const mw = requireOwnershipOrAdmin({ load: loadsOrder() });

    await mw(req, mockRes(), vi.fn());

    // The handler should not have to fetch the same row a second time.
    expect(req.resource).toEqual(ORDER);
  });

  it('attaches under a custom key when asked', async () => {
    const req = { user: OWNER, params: { id: '42' } };
    const mw = requireOwnershipOrAdmin({
      load: loadsOrder(),
      attachAs: 'order',
    });

    await mw(req, mockRes(), vi.fn());

    expect(req.order).toEqual(ORDER);
    expect(req.resource).toBeUndefined();
  });

  it('passes the whole request to the loader', async () => {
    const load = loadsOrder();
    const req = { user: OWNER, params: { id: '42' } };

    await requireOwnershipOrAdmin({ load })(req, mockRes(), vi.fn());

    expect(load).toHaveBeenCalledWith(req);
  });

  it('lets an admin through for a resource they do not own', async () => {
    const next = vi.fn();
    const mw = requireOwnershipOrAdmin({ load: loadsOrder() });

    await mw({ user: ADMIN, params: { id: '42' } }, mockRes(), next);

    // System Plan 8.2 grants admins access to all orders, payments and reviews.
    expect(next).toHaveBeenCalledWith();
  });

  it('returns 404 rather than 403 for a resource the caller does not own', async () => {
    const next = vi.fn();
    const mw = requireOwnershipOrAdmin({ load: loadsOrder() });

    await mw({ user: OTHER, params: { id: '42' } }, mockRes(), next);

    // 403 would confirm the resource exists. Ids are sequential integers, so
    // that lets anyone count the store's orders by walking /orders/1, /orders/2
    // and reading the status codes.
    expect(errorFrom(next)).toBeInstanceOf(NotFoundError);
    expect(errorFrom(next)).toMatchObject({ status: 404 });
  });

  it('returns 404 when the resource does not exist', async () => {
    const next = vi.fn();
    const mw = requireOwnershipOrAdmin({ load: loadsNothing() });

    await mw({ user: OWNER, params: { id: '999' } }, mockRes(), next);

    expect(errorFrom(next)).toBeInstanceOf(NotFoundError);
  });

  it('gives an identical message for "not found" and "not yours"', async () => {
    const missing = vi.fn();
    const notOwned = vi.fn();

    await requireOwnershipOrAdmin({ load: loadsNothing() })(
      { user: OWNER, params: { id: '999' } },
      mockRes(),
      missing
    );
    await requireOwnershipOrAdmin({ load: loadsOrder() })(
      { user: OTHER, params: { id: '42' } },
      mockRes(),
      notOwned
    );

    // A different message would leak the same fact the status code is hiding.
    expect(errorFrom(missing).message).toBe(errorFrom(notOwned).message);
  });

  it('uses the supplied resource name in the message', async () => {
    const next = vi.fn();
    const mw = requireOwnershipOrAdmin({
      load: loadsNothing(),
      resourceName: 'Payment',
    });

    await mw({ user: OWNER, params: { id: '1' } }, mockRes(), next);

    expect(errorFrom(next).message).toContain('Payment');
  });

  it('still returns 404 to an admin when the resource does not exist', async () => {
    const next = vi.fn();
    const mw = requireOwnershipOrAdmin({ load: loadsNothing() });

    await mw({ user: ADMIN, params: { id: '999' } }, mockRes(), next);

    expect(errorFrom(next)).toBeInstanceOf(NotFoundError);
  });

  it('honours a custom owner field', async () => {
    const next = vi.fn();
    const review = { id: 3, authorId: 7 };
    const mw = requireOwnershipOrAdmin({
      load: vi.fn().mockResolvedValue(review),
      ownerField: 'authorId',
    });

    await mw({ user: OWNER, params: { id: '3' } }, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it('rejects with 401 when authenticate has not run', async () => {
    const next = vi.fn();
    const mw = requireOwnershipOrAdmin({ load: loadsOrder() });

    await mw({ params: { id: '42' } }, mockRes(), next);

    // A wiring mistake rather than a client error, but 401 is still honest:
    // no identity was established, so we cannot say the caller is forbidden.
    expect(errorFrom(next)).toBeInstanceOf(UnauthorizedError);
  });

  it('does not call the loader when there is no authenticated user', async () => {
    const load = loadsOrder();

    await requireOwnershipOrAdmin({ load })({ params: { id: '42' } }, mockRes(), vi.fn());

    // No database round trip for a request that cannot succeed.
    expect(load).not.toHaveBeenCalled();
  });

  it('passes a loader failure to the error handler', async () => {
    const boom = new Error('connection lost');
    const next = vi.fn();
    const mw = requireOwnershipOrAdmin({
      load: vi.fn().mockRejectedValue(boom),
    });

    await mw({ user: OWNER, params: { id: '42' } }, mockRes(), next);

    expect(next).toHaveBeenCalledWith(boom);
  });

  it('treats a string owner id as equal to a numeric one', async () => {
    const next = vi.fn();
    const mw = requireOwnershipOrAdmin({
      load: vi.fn().mockResolvedValue({ id: 42, userId: '7' }),
    });

    await mw({ user: OWNER, params: { id: '42' } }, mockRes(), next);

    // Defensive: authenticate already coerces sub to a number, but a repository
    // returning a string id would otherwise lock the owner out of their own
    // resource with a 404 that looks like a data problem.
    expect(next).toHaveBeenCalledWith();
  });
});
