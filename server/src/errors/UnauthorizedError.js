import AppError from "./AppError.js";

class UnauthorizedError extends AppError {
  constructor(message) {
    super(401, "UNAUTHORIZED", message);
  }
}

export default UnauthorizedError;