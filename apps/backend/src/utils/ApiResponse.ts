export class ApiResponse<T> {
  public readonly success: boolean;
  public readonly data: T | null;
  public readonly message: string;
  public readonly errors: unknown;

  constructor(success: boolean, data: T | null, message: string, errors: unknown = null) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.errors = errors;
  }
}
