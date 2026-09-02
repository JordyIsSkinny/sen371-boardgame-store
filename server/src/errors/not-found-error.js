import AppError from "./app-error.js";

class NotFoundError extends AppError {
  constructor(message) {
    super(404, "NOT_FOUND", message);
  }
}

export default NotFoundError;