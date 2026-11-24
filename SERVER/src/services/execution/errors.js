class ExecutionUnavailableError extends Error {
  /** code: EXEC_UNAVAILABLE | EXEC_BUSY | EXEC_IMAGE_PREPARING */
  constructor(message, code = "EXEC_UNAVAILABLE") {
    super(message);
    this.name = "ExecutionUnavailableError";
    this.code = code;
  }
}
module.exports = { ExecutionUnavailableError };
