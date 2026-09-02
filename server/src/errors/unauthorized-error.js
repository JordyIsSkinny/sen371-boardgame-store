import AppError from "./app-error.js";

class UnauthorizedError extends AppError {
  constructor(message) {
    super(401, "UNAUTHORIZED", message);
  }
}

export default UnauthorizedError;
