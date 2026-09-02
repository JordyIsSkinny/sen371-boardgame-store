import { isProduction } from "../config/index.js";
import UnauthorizedError from "../errors/unauthorized-error.js";

// TEMPORARY STUB, owned by D (Authentication & Security), replace ASAP.
// Any bearer token is accepted and mapped to a fixed dev user.
//
// This throw makes it physically impossible for the stub to reach
// production undetected: if this file is still imported when
// NODE_ENV=production, the app fails at boot instead of shipping wide open.
if (isProduction) {
  throw new Error(
    "authenticate.stub.js must not be imported in production. Replace with D's real authenticate middleware before deploying.",
  );
}

export function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return next(new UnauthorizedError("Missing bearer token."));
  }

  req.user = { id: 1, role: "customer" };

  next();
}
