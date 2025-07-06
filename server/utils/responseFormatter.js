/**
 * Standard API response formatter
 * Provides consistent response structure across all endpoints
 */

/**
 * Success response formatter
 * @param {Object} data - The data to return
 * @param {string} message - Success message
 * @param {Object} meta - Additional metadata (pagination, etc.)
 * @returns {Object} Formatted response object
 */
const successResponse = (data = null, message = "Success", meta = null) => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
  };

  if (data !== null) {
    response.data = data;
  }

  if (meta !== null) {
    response.meta = meta;
  }

  return response;
};

/**
 * Error response formatter
 * @param {string} message - Error message
 * @param {Array} errors - Array of error details
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Formatted error response object
 */
const errorResponse = (
  message = "An error occurred",
  errors = null,
  statusCode = 500
) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
    statusCode,
  };

  if (errors && errors.length > 0) {
    response.errors = errors;
  }

  return response;
};

/**
 * Pagination response formatter
 * @param {Array} data - The paginated data
 * @param {Object} pagination - Pagination information
 * @param {string} message - Success message
 * @returns {Object} Formatted paginated response
 */
const paginatedResponse = (
  data,
  pagination,
  message = "Data retrieved successfully"
) => {
  return successResponse(data, message, { pagination });
};

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse,
};
