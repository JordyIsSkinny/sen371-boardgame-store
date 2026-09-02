// Catches any request that didn't match a route. Sits after all route
// mounts and before errorHandler, so it flows through the same error shape.

export function notFound(req, res, next) {
  next({
    status: 404,
    code: "ROUTE_NOT_FOUND",
    message: `No route for ${req.method} ${req.originalUrl}`,
  });
}
