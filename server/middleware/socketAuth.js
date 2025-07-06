/**
 * Enhanced Socket.IO authentication middleware
 * Handles token validation and expiration for real-time connections
 */

const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Socket.IO authentication middleware
 * @param {Object} socket - Socket.IO socket instance
 * @param {Function} next - Next middleware function
 */
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication token required"));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user exists and is active
    const user = await User.findById(decoded.userId).select(
      "-password -refreshTokens"
    );
    if (!user || !user.isActive) {
      return next(new Error("Invalid token or user deactivated"));
    }

    // Attach user information to socket
    socket.userId = decoded.userId;
    socket.user = user;

    // Store token expiration time
    socket.tokenExp = decoded.exp;

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(new Error("Token expired"));
    } else if (error.name === "JsonWebTokenError") {
      return next(new Error("Invalid token"));
    }

    console.error("Socket authentication error:", error);
    return next(new Error("Authentication failed"));
  }
};

/**
 * Check if socket token is still valid
 * @param {Object} socket - Socket.IO socket instance
 * @returns {boolean} True if token is still valid
 */
const isTokenValid = (socket) => {
  if (!socket.tokenExp) {
    return false;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  return socket.tokenExp > currentTime;
};

/**
 * Handle token expiration for active socket connections
 * @param {Object} io - Socket.IO server instance
 */
const handleTokenExpiration = (io) => {
  // Check all connected sockets every minute
  setInterval(() => {
    io.sockets.sockets.forEach((socket) => {
      if (!isTokenValid(socket)) {
        console.log(
          `Disconnecting socket ${socket.id} due to token expiration`
        );
        socket.emit("token_expired", {
          message: "Your session has expired. Please log in again.",
        });
        socket.disconnect(true);
      }
    });
  }, 60000); // Check every minute
};

/**
 * Socket event handlers for todo real-time updates
 * @param {Object} socket - Socket.IO socket instance
 * @param {Object} io - Socket.IO server instance
 */
const setupSocketHandlers = (socket, io) => {
  console.log(`User ${socket.userId} connected`);

  // Join user-specific room
  socket.join(`user_${socket.userId}`);

  // Handle todo updates
  socket.on("todo_updated", (data) => {
    // Validate that the todo belongs to the authenticated user
    if (data.userId && data.userId === socket.userId) {
      socket.to(`user_${socket.userId}`).emit("todo_updated", data);
    }
  });

  socket.on("todo_created", (data) => {
    if (data.userId && data.userId === socket.userId) {
      socket.to(`user_${socket.userId}`).emit("todo_created", data);
    }
  });

  socket.on("todo_deleted", (data) => {
    if (data.userId && data.userId === socket.userId) {
      socket.to(`user_${socket.userId}`).emit("todo_deleted", data);
    }
  });

  // Handle bulk operations
  socket.on("todos_bulk_updated", (data) => {
    if (data.userId && data.userId === socket.userId) {
      socket.to(`user_${socket.userId}`).emit("todos_bulk_updated", data);
    }
  });

  // Handle typing indicators for collaborative features (future enhancement)
  socket.on("typing_start", (data) => {
    socket.to(`user_${socket.userId}`).emit("user_typing", {
      userId: socket.userId,
      username: socket.user.username,
      todoId: data.todoId,
    });
  });

  socket.on("typing_stop", (data) => {
    socket.to(`user_${socket.userId}`).emit("user_stopped_typing", {
      userId: socket.userId,
      todoId: data.todoId,
    });
  });

  // Handle token refresh for socket connection
  socket.on("refresh_token", async (data) => {
    try {
      const { token } = data;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Update socket with new token information
      socket.tokenExp = decoded.exp;

      socket.emit("token_refreshed", { success: true });
    } catch (error) {
      socket.emit("token_refresh_failed", {
        message: "Failed to refresh token",
      });
      socket.disconnect(true);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`User ${socket.userId} disconnected: ${reason}`);
  });

  socket.on("error", (error) => {
    console.error(`Socket error for user ${socket.userId}:`, error);
  });
};

module.exports = {
  authenticateSocket,
  isTokenValid,
  handleTokenExpiration,
  setupSocketHandlers,
};
