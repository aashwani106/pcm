export class ApiResponse {
    
    constructor(success, data = null, message = "", errors = null) {
      this.success = success;
      this.data = data;
      this.message = message;
      this.errors = errors;
    }
  }
  