import AppError from "./app-error.js";

class ValidationError extends AppError {
  constructor(message, details = undefined) {
    super(422, "VALIDATION_ERROR", message, details);
  }
}

export default ValidationError;