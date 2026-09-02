import ForbiddenError from "../errors/forbidden-error.js";

// TEMPORARY STUB, owned by D (Authentication & Security), replace ASAP.
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user?.role)) {
      return next(new ForbiddenError("You do not have access to this resource."));
    }
    next();
  };
}
