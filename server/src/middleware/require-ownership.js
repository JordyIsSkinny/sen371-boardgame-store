import NotFoundError from '../errors/not-found-error.js';
import UnauthorizedError from '../errors/unauthorized-error.js';

/**
 * Ownership gate for resources scoped to a single user — orders, payments,
 * reviews. Runs after authenticate, never instead of it.
 *
 *   router.get(
 *     '/:id',
 *     authenticate,
 *     validate({ params: orderIdSchema }),
 *     requireOwnershipOrAdmin({
 *       load: (req) => getOrderById(Number(req.params.id)),
 *       resourceName: 'Order',
 *       attachAs: 'order',
 *     }),
 *     handler
 *   );
 *
 * Two rules, both deliberate.
 *
 * **Admins pass.** System Plan 8.2 grants admins access to all orders,
 * payments and reviews. The ownership check previously inlined in
 * orders.routes.js had no bypass, so an admin received 403 on every order but
 * their own — which would break the admin dashboard.
 *
 * **A resource the caller does not own returns 404, not 403.** A 403 confirms
 * the resource exists. Ids are sequential integers, so distinguishing the two
 * lets anyone count the store's orders by walking /orders/1, /orders/2 and
 * reading the status codes. Returning the same 404 and the same message for
 * "does not exist" and "not yours" leaks nothing — the same reasoning as the
 * single generic login failure message in 8.2.
 *
 * The loaded resource is attached to the request so the handler does not
 * repeat the query.
 *
 * @param {object}   options
 * @param {Function} options.load          async (req) => resource | null
 * @param {string}   [options.ownerField]  field on the resource holding the owner id
 * @param {string}   [options.resourceName] used in the error message
 * @param {string}   [options.attachAs]    request property to attach the resource to
 */
export function requireOwnershipOrAdmin({
  load,
  ownerField = 'userId',
  resourceName = 'Resource',
  attachAs = 'resource',
}) {
  const notFound = () => new NotFoundError(`${resourceName} not found.`);

  return async function requireOwnershipMiddleware(req, res, next) {
    if (!req.user) {
      // authenticate was not applied ahead of this middleware. Returning
      // before the loader runs avoids a database round trip for a request
      // that cannot succeed.
      return next(new UnauthorizedError('Authentication required.'));
    }

    let resource;

    try {
      resource = await load(req);
    } catch (err) {
      return next(err);
    }

    if (!resource) {
      return next(notFound());
    }

    // Loose comparison on purpose: authenticate coerces the JWT sub claim to a
    // number, but a repository returning a string id would otherwise lock the
    // owner out of their own resource with a 404 that reads like a data bug.
    const isOwner = String(resource[ownerField]) === String(req.user.id);

    if (!isOwner && req.user.role !== 'admin') {
      return next(notFound());
    }

    req[attachAs] = resource;
    return next();
  };
}
