const express = require("express");
const User = require("../models/User");
const { asyncHandler, AppError } = require("../middleware/errorHandler");

const router = express.Router();

// Get current user profile
router.get(
  "/profile",
  asyncHandler(async (req, res) => {
    res.json({
      user: req.user.toPublicJSON(),
    });
  })
);

// Update user profile
router.put(
  "/profile",
  asyncHandler(async (req, res) => {
    const allowedUpdates = [
      "username",
      "email",
      "avatar",
      "theme",
      "preferences",
    ];
    const updates = {};

    // Filter allowed updates
    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      throw new AppError("No valid updates provided", 400);
    }

    // Check if username or email is being changed and if they're unique
    if (updates.username || updates.email) {
      const query = { _id: { $ne: req.userId } };

      if (updates.username) {
        query.username = updates.username;
      }

      if (updates.email) {
        query.email = updates.email;
      }

      const existingUser = await User.findOne(query);
      if (existingUser) {
        const field =
          existingUser.username === updates.username ? "username" : "email";
        throw new AppError(`${field} already exists`, 409);
      }
    }

    // Update user
    const user = await User.findByIdAndUpdate(req.userId, updates, {
      new: true,
      runValidators: true,
    });

    res.json({
      message: "Profile updated successfully",
      user: user.toPublicJSON(),
    });
  })
);

// Change password
router.put(
  "/change-password",
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError("Current password and new password are required", 400);
    }

    if (newPassword.length < 6) {
      throw new AppError(
        "New password must be at least 6 characters long",
        400
      );
    }

    // Get user with password
    const user = await User.findById(req.userId).select("+password");

    // Verify current password
    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) {
      throw new AppError("Current password is incorrect", 400);
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: "Password changed successfully" });
  })
);

// Delete account
router.delete(
  "/account",
  asyncHandler(async (req, res) => {
    const { password } = req.body;

    if (!password) {
      throw new AppError("Password is required to delete account", 400);
    }

    // Get user with password
    const user = await User.findById(req.userId).select("+password");

    // Verify password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      throw new AppError("Password is incorrect", 400);
    }

    // Soft delete (deactivate) instead of hard delete for data integrity
    user.isActive = false;
    user.email = `deleted_${Date.now()}_${user.email}`;
    user.username = `deleted_${Date.now()}_${user.username}`;
    await user.save();

    res.json({ message: "Account deleted successfully" });
  })
);

// Get user statistics
router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.userId);

    const stats = {
      memberSince: user.createdAt,
      lastLogin: user.lastLogin,
      theme: user.theme,
      preferences: user.preferences,
      emailVerified: user.isEmailVerified,
    };

    res.json(stats);
  })
);

module.exports = router;
