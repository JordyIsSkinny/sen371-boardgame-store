import AppError from "./AppError.js";

class ConflictError extends AppError {
  constructor(message) {
    super(409, "CONFLICT", message);
  }
}

export default ConflictError;