/**
 * Global error handler middleware.
 * All thrown errors with .status property get that HTTP status.
 * Unexpected errors return 500.
 */
function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  const message = err.message || 'เกิดข้อผิดพลาดภายในระบบ';

  if (status === 500) {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err);
  }

  res.status(status).json({ error: message });
}

/**
 * Creates an Error with a specific HTTP status code.
 */
function createError(status, message) {
  return Object.assign(new Error(message), { status });
}

module.exports = { errorHandler, createError };
