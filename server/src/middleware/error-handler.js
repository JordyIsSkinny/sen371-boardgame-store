import { Prisma } from "@prisma/client";
import AppError from "../errors/app-error.js";
import ConflictError from "../errors/conflict-error.js";
import NotFoundError from "../errors/not-found-error.js";

function mapPrismaError(err) {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) {
    return null;
  }

  switch (err.code) {
    case "P2002":
      return new ConflictError(
        "A record with the provided value already exists."
      );

    case "P2025":
      return new NotFoundError(
        "The requested resource was not found."
      );

    default:
      return null;
  }
}

function errorHandler(err, req, res, next) {
  // Map known Prisma errors to application errors first.
  const mappedError = mapPrismaError(err);

  if (mappedError) {
    err = mappedError;
  }

  // Handle known application errors
  if (err instanceof AppError) {
    return res.status(err.status).json({
      status: err.status,
      error: err.error,
      message: err.message,
      ...(err.details !== undefined && { details: err.details }),
    });
  }

  // Handle unexpected errors
  console.error(err);

  return res.status(500).json({
    status: 500,
    error: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred.",
  });
}

export default errorHandler;
