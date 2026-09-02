import AppError from "../errors/app-error.js";

// STUB, owned by A (Error Handling), replaced wholesale once PR #26 merges.
// Matches A's real implementation exactly: { status, error, message, details? },
// flat, "error" is a string code. NOT the nested shape originally written
// into the work division doc, that was superseded once the group confirmed
// System Plan 8.3 as the authoritative source.

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      status: err.status,
      error: err.error,
      message: err.message,
      ...(err.details !== undefined && { details: err.details }),
    });
  }

  console.error(err);

  return res.status(500).json({
    status: 500,
    error: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred.",
  });
}
