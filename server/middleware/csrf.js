/**
 * Custom CSRF Protection Middleware
 * Implements double-submit cookie pattern for CSRF protection
 */

const crypto = require("crypto");
const { AppError } = require("./errorHandler");

/**
 * Generate a secure random token
 * @returns {string} Random token
 */
const generateToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

/**
 * CSRF protection middleware
 * Uses double-submit cookie pattern
 */
const csrfProtection = {
  /**
   * Generate CSRF token and set cookie
   */
  generateToken: (req, res, next) => {
    const token = generateToken();

    // Set CSRF token as httpOnly cookie
    res.cookie("csrf-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    // Also send token in response for client to include in headers
    res.locals.csrfToken = token;
    req.csrfToken = token;

    next();
  },

  /**
   * Verify CSRF token
   */
  verifyToken: (req, res, next) => {
    // Skip CSRF protection for GET, HEAD, and OPTIONS requests
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      return next();
    }

    // Skip CSRF protection in development if disabled
    if (
      process.env.NODE_ENV === "development" &&
      process.env.DISABLE_CSRF === "true"
    ) {
      return next();
    }

    const cookieToken = req.cookies["csrf-token"];
    const headerToken =
      req.headers["x-csrf-token"] || req.headers["csrf-token"];
    const bodyToken = req.body._csrf;

    // Check if we have both cookie and header/body token
    if (!cookieToken || (!headerToken && !bodyToken)) {
      return next(new AppError("CSRF token missing", 403));
    }

    // Verify tokens match
    const submittedToken = headerToken || bodyToken;
    if (cookieToken !== submittedToken) {
      return next(new AppError("Invalid CSRF token", 403));
    }

    next();
  },

  /**
   * Endpoint to get CSRF token
   */
  getToken: (req, res) => {
    res.json({
      success: true,
      csrfToken: req.csrfToken,
      message: "CSRF token generated successfully",
    });
  },
};

/**
 * Apply CSRF protection to specific routes
 * @param {Array} protectedMethods - HTTP methods to protect (default: ['POST', 'PUT', 'DELETE', 'PATCH'])
 */
const applyCsrfProtection = (
  protectedMethods = ["POST", "PUT", "DELETE", "PATCH"]
) => {
  return (req, res, next) => {
    if (protectedMethods.includes(req.method)) {
      return csrfProtection.verifyToken(req, res, next);
    }
    next();
  };
};

module.exports = {
  csrfProtection,
  applyCsrfProtection,
  generateToken,
};
