import AppError from "./AppError.js";

class ForbiddenError extends AppError {
  constructor(message) {
    super(403, "FORBIDDEN", message);
  }
}

export default ForbiddenError;