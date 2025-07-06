const express = require("express");
const User = require("../models/User");
const { generateTokens, verifyRefreshToken } = require("../middleware/auth");
const { asyncHandler, AppError } = require("../middleware/errorHandler");
const { validate } = require("../middleware/validation");
const { successResponse } = require("../utils/responseFormatter");
const rateLimit = require("express-rate-limit");

const router = express.Router();

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // increased limit for development
  message: "Too many authentication attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in development
    return process.env.NODE_ENV === "development";
  },
});

// Register
router.post(
  "/register",
  authLimiter,
  validate("register"),
  asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      const field = existingUser.email === email ? "email" : "username";
      throw new AppError(`User with this ${field} already exists`, 409);
    }

    // Create user
    const user = new User({ username, email, password });
    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Save refresh token to user
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    // Set refresh token as httpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json(
      successResponse(
        {
          user: user.toPublicJSON(),
          accessToken,
        },
        "User registered successfully"
      )
    );
  })
);

// Login
router.post(
  "/login",
  authLimiter,
  validate("login"),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Find user and include password for verification
    const user = await User.findOne({ email }).select("+password");

    if (!user || !user.isActive) {
      throw new AppError("Invalid credentials", 401);
    }

    // Check password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      throw new AppError("Invalid credentials", 401);
    }

    // Update last login
    user.lastLogin = new Date();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Save refresh token to user
    user.refreshTokens.push({ token: refreshToken });

    // Clean up old refresh tokens (keep only last 5)
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }

    await user.save();

    // Set refresh token as httpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json(
      successResponse(
        {
          user: user.toPublicJSON(),
          accessToken,
        },
        "Login successful"
      )
    );
  })
);

// Refresh token with rotation
router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      throw new AppError("Refresh token required", 401);
    }

    try {
      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);

      // Find user and check if refresh token exists
      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw new AppError("Invalid refresh token", 401);
      }

      const tokenExists = user.refreshTokens.some(
        (tokenObj) => tokenObj.token === refreshToken
      );

      if (!tokenExists) {
        // If refresh token doesn't exist, it might be compromised
        // Remove all refresh tokens for security
        await User.findByIdAndUpdate(user._id, {
          $set: { refreshTokens: [] },
        });
        throw new AppError(
          "Invalid refresh token - security breach detected",
          401
        );
      }

      // Generate new tokens (rotation)
      const { accessToken, refreshToken: newRefreshToken } = generateTokens(
        user._id
      );

      // Atomically replace old refresh token with new one
      await User.findByIdAndUpdate(user._id, {
        $pull: { refreshTokens: { token: refreshToken } },
      });

      await User.findByIdAndUpdate(user._id, {
        $push: { refreshTokens: { token: newRefreshToken } },
      });

      // Clean up old refresh tokens (keep only last 5)
      const updatedUser = await User.findById(user._id);
      if (updatedUser.refreshTokens.length > 5) {
        const tokensToKeep = updatedUser.refreshTokens.slice(-5);
        await User.findByIdAndUpdate(user._id, {
          $set: { refreshTokens: tokensToKeep },
        });
      }

      // Set new refresh token cookie
      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({
        message: "Token refreshed successfully",
        user: user.toPublicJSON(),
        accessToken,
      });
    } catch (error) {
      // Clear refresh token cookie on any error
      res.clearCookie("refreshToken");

      if (error.name === "TokenExpiredError") {
        throw new AppError("Refresh token expired", 401);
      } else if (error.name === "JsonWebTokenError") {
        throw new AppError("Invalid refresh token", 401);
      }

      throw error;
    }
  })
);

// Logout
router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.cookies;

    if (refreshToken) {
      // Remove refresh token from database
      await User.updateOne(
        { "refreshTokens.token": refreshToken },
        { $pull: { refreshTokens: { token: refreshToken } } }
      );
    }

    // Clear refresh token cookie
    res.clearCookie("refreshToken");

    res.json({ message: "Logout successful" });
  })
);

// Logout from all devices
router.post(
  "/logout-all",
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.cookies;

    if (refreshToken) {
      const decoded = verifyRefreshToken(refreshToken);
      await User.findByIdAndUpdate(decoded.userId, { refreshTokens: [] });
    }

    // Clear refresh token cookie
    res.clearCookie("refreshToken");

    res.json({ message: "Logged out from all devices" });
  })
);

module.exports = router;
