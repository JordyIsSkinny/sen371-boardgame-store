class AppError extends Error {
  constructor(status, error, message, details = undefined) {
    super(message);

    this.name = this.constructor.name;
    this.status = status;
    this.error = error;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;