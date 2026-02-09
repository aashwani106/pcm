export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errors: unknown;
  public readonly success = false;

  constructor(statusCode: number, message: string, errors: unknown = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}
