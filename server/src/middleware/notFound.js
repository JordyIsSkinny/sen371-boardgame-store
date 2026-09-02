import NotFoundError from "../errors/not-found-error.js";

export function notFound(req, res, next) {
  next(new NotFoundError(`No route for ${req.method} ${req.originalUrl}`));
}
