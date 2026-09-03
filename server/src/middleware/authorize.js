import UnauthorizedError from '../errors/unauthorized-error.js';
import ForbiddenError from '../errors/forbidden-error.js';

/**
 * Role gate. Always runs after authenticate, never instead of it.
 *
 *   router.post('/products', authenticate, authorize('admin'), controller)
 *
 * The 401/403 distinction is deliberate and assessed: 401 means we do not
 * know who the caller is, 403 means we do and they are not permitted.
 * Returning 403 to an unauthenticated request would tell an anonymous caller
 * that the endpoint exists and is role-gated.
 */
export function authorize(...allowedRoles) {
  return function authorizeMiddleware(req, res, next) {
    if (!req.user) {
      // authenticate was not applied ahead of this middleware — a wiring
      // mistake rather than a client error, but 401 is still the honest
      // answer since no identity was established.
      return next(new UnauthorizedError('Authentication required.'));
    }

    // Fails closed on an empty role list. authorize() with no arguments is
    // almost certainly a mistake, and defaulting to allow would silently
    // open an endpoint that was meant to be restricted.
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError('You do not have permission to perform this action.')
      );
    }

    return next();
  };
}
