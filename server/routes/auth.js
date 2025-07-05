const express = require("express");
const User = require("../models/User");
const { generateTokens, verifyRefreshToken } = require("../middleware/auth");
const { asyncHandler, AppError } = require("../middleware/errorHandler");
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
  asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      throw new AppError("Username, email, and password are required", 400);
    }

    if (password.length < 6) {
      throw new AppError("Password must be at least 6 characters long", 400);
    }

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

    res.status(201).json({
      message: "User registered successfully",
      user: user.toPublicJSON(),
      accessToken,
    });
  })
);

// Login
router.post(
  "/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError("Email and password are required", 400);
    }

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

    res.json({
      message: "Login successful",
      user: user.toPublicJSON(),
      accessToken,
    });
  })
);

// Refresh token
router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      throw new AppError("Refresh token required", 401);
    }

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
      throw new AppError("Invalid refresh token", 401);
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      user._id
    );

    // Use atomic update to replace old refresh token with new one
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        $pull: { refreshTokens: { token: refreshToken } },
      },
      { new: true }
    );

    if (updatedUser) {
      await User.findByIdAndUpdate(user._id, {
        $push: { refreshTokens: { token: newRefreshToken } },
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
