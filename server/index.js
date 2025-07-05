const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const { createServer } = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const todoRoutes = require("./routes/todos");
const userRoutes = require("./routes/users");
const { authenticateToken } = require("./middleware/auth");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

const PORT = process.env.PORT || 5000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/todoapp";

// Security middleware
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", "ws:", "wss:"],
      },
    },
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // increased limit for development
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and in development
    if (req.path === "/api/health" || process.env.NODE_ENV === "development") {
      return true;
    }
    return false;
  },
});
app.use(limiter);

// Middleware
app.use(compression());
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/todos", authenticateToken, todoRoutes);
app.use("/api/users", authenticateToken, userRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Socket.IO for real-time updates
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication error"));
  }

  const jwt = require("jsonwebtoken");
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback_secret"
    );
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
});

io.on("connection", (socket) => {
  console.log(`User ${socket.userId} connected`);

  // Join user-specific room
  socket.join(`user_${socket.userId}`);

  // Handle todo updates
  socket.on("todo_updated", (data) => {
    socket.to(`user_${socket.userId}`).emit("todo_updated", data);
  });

  socket.on("todo_created", (data) => {
    socket.to(`user_${socket.userId}`).emit("todo_created", data);
  });

  socket.on("todo_deleted", (data) => {
    socket.to(`user_${socket.userId}`).emit("todo_deleted", data);
  });

  socket.on("disconnect", () => {
    console.log(`User ${socket.userId} disconnected`);
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
