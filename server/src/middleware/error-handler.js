import AppError from "../errors/app-error.js";

function errorHandler(err, req, res, next) {
  // Handle known application errors
  if (err instanceof AppError) {
    return res.status(err.status).json({
      status: err.status,
      error: err.error,
      message: err.message,
      ...(err.details !== undefined && { details: err.details })
    });
  }

  // Handle unexpected errors
  console.error(err);

  return res.status(500).json({
    status: 500,
    error: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred."
  });
}

export default errorHandler;