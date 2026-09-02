// STUB, owned by A (Error Handling). This exists so the middleware chain
// is wired end to end and every route has somewhere to throw to. A replaces
// the body of this on Tuesday with the real error class hierarchy and
// Prisma error mapping; the shape below is the one thing that must not
// change without updating every client-side error handler too.
//
// Agreed shape (locked at kickoff, section 4 of the work division):
// { error: { code, message, details? } }

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status ?? 500;

  const body = {
    error: {
      code: err.code ?? "INTERNAL_ERROR",
      message: err.message ?? "Something went wrong.",
    },
  };

  if (err.details) {
    body.error.details = err.details;
  }

  if (status >= 500) {
    // Replaced by A's real logger; console.error is enough to unblock
    // everyone else building against this middleware this week.
    console.error(err);
  }

  res.status(status).json(body);
}
