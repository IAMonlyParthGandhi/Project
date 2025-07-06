const { errorResponse } = require("../utils/responseFormatter");

const errorHandler = (err, req, res, next) => {
  console.error("Error Stack:", err.stack);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((error) => ({
      field: error.path,
      message: error.message,
    }));

    return res.status(400).json(errorResponse("Validation Error", errors, 400));
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];

    return res
      .status(409)
      .json(
        errorResponse(
          `${
            field.charAt(0).toUpperCase() + field.slice(1)
          } '${value}' already exists`,
          [{ field, value }],
          409
        )
      );
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === "CastError") {
    return res
      .status(400)
      .json(errorResponse("Invalid ID format", [{ field: err.path }], 400));
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json(errorResponse("Invalid token", null, 401));
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json(errorResponse("Token expired", null, 401));
  }

  // File upload errors
  if (err.code === "LIMIT_FILE_SIZE") {
    return res
      .status(400)
      .json(errorResponse("File size too large", [{ maxSize: "10MB" }], 400));
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res
      .status(400)
      .json(errorResponse("Unexpected file field", null, 400));
  }

  // Rate limiting error
  if (err.status === 429) {
    return res
      .status(429)
      .json(
        errorResponse("Too many requests, please try again later", null, 429)
      );
  }

  // Custom application errors
  if (err.statusCode) {
    return res
      .status(err.statusCode)
      .json(errorResponse(err.message, err.errors || null, err.statusCode));
  }

  // Default server error
  res
    .status(500)
    .json(
      errorResponse(
        "Internal Server Error",
        process.env.NODE_ENV === "development" ? [{ stack: err.stack }] : null,
        500
      )
    );
};

// Custom error class for application errors
class AppError extends Error {
  constructor(message, statusCode, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Async error wrapper to catch async errors
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  AppError,
  asyncHandler,
};
