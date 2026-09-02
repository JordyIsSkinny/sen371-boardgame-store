// TEMPORARY STUB, owned by D (Authentication & Security), replace Tuesday.
//
// This exists purely so the middleware chain (CORS -> auth -> RBAC ->
// validation -> controller -> error handler) is wired and demonstrable end
// to end for the cart vertical slice before real JWT verification exists.
// It does NOT verify anything. Do not let this reach Wednesday's review.
//
// Contract D should preserve when replacing this: reads the Authorization
// header, verifies the JWT, and attaches { id, role } to req.user. Anything
// downstream (controllers, services) should only ever read req.user, never
// touch the token itself, that boundary is what keeps auth swappable.

export function authenticateStub(req, res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return next({ status: 401, code: "UNAUTHENTICATED", message: "Missing bearer token." });
  }

  // Real implementation: jwt.verify(token, config.jwt.secret) and pull the
  // user id + role out of the decoded payload. For now, any bearer token
  // is accepted and mapped to a fixed dev user so the cart slice has a
  // req.user to work against.
  req.user = { id: 1, role: "customer" };

  next();
}
