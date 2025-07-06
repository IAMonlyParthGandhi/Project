/**
 * @fileoverview Authentication middleware for JWT token validation and generation
 * @module middleware/auth
 */

const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Express middleware to authenticate JWT tokens
 * Verifies the Bearer token from Authorization header and attaches user info to request
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 *
 * @example
 * // Usage in routes
 * router.get('/protected', authenticateToken, (req, res) => {
 *   // req.user and req.userId are now available
 *   res.json({ message: `Hello ${req.user.username}` });
 * });
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ message: "Access token required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user details and attach to request
    const user = await User.findById(decoded.userId).select(
      "-password -refreshTokens"
    );
    if (!user || !user.isActive) {
      return res
        .status(401)
        .json({ message: "Invalid token or user deactivated" });
    }

    req.user = user;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    } else if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    }

    console.error("Auth middleware error:", error);
    return res.status(500).json({ message: "Authentication error" });
  }
};

/**
 * Generates access and refresh JWT tokens for a user
 *
 * @param {string} userId - MongoDB ObjectId of the user
 * @returns {Object} Object containing accessToken and refreshToken
 * @returns {string} returns.accessToken - Short-lived access token (15 minutes)
 * @returns {string} returns.refreshToken - Long-lived refresh token (7 days)
 *
 * @example
 * const tokens = generateTokens(user._id);
 * console.log(tokens.accessToken); // "eyJhbGciOiJIUzI1NiIs..."
 * console.log(tokens.refreshToken); // "eyJhbGciOiJIUzI1NiIs..."
 */
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  const refreshToken = jwt.sign(
    { userId, type: "refresh" },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
  );

  return { accessToken, refreshToken };
};

/**
 * Verifies and decodes a refresh token
 *
 * @param {string} token - The refresh token to verify
 * @returns {Object} Decoded token payload containing userId and type
 * @throws {Error} When token is invalid or expired
 *
 * @example
 * try {
 *   const decoded = verifyRefreshToken(refreshToken);
 *   console.log(decoded.userId); // User ID from token
 * } catch (error) {
 *   console.error('Invalid refresh token:', error.message);
 * }
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error("Invalid refresh token");
  }
};

module.exports = {
  authenticateToken,
  generateTokens,
  verifyRefreshToken,
};
