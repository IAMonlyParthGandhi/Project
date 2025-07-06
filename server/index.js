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

// Validate environment configuration
const { validateEnvironment } = require("./config/environment");
validateEnvironment();

const authRoutes = require("./routes/auth");
const todoRoutes = require("./routes/todos");
const userRoutes = require("./routes/users");
const { authenticateToken } = require("./middleware/auth");
const { errorHandler } = require("./middleware/errorHandler");
const {
  authenticateSocket,
  handleTokenExpiration,
  setupSocketHandlers,
} = require("./middleware/socketAuth");

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

// Enhanced compression settings for better performance
app.use(
  compression({
    level: 9, // Maximum compression level
    threshold: 1024, // Only compress responses larger than 1KB
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) {
        return false;
      }
      return compression.filter(req, res);
    },
    // Enable brotli compression if available
    brotli: {
      enabled: true,
      zlib: {},
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
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Add cache control middleware for static assets
app.use((req, res, next) => {
  // Static files cache for 1 day
  if (req.url.match(/\.(css|js|jpg|jpeg|png|gif|ico|woff|woff2|ttf|svg)$/)) {
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Expires", new Date(Date.now() + 86400000).toUTCString());
  }
  // API responses - no cache by default
  else if (req.url.startsWith("/api/")) {
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
  next();
});

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

// API v1 Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/todos", authenticateToken, todoRoutes);
app.use("/api/v1/users", authenticateToken, userRoutes);

// Legacy routes (maintain backward compatibility)
app.use("/api/auth", authRoutes);
app.use("/api/todos", authenticateToken, todoRoutes);
app.use("/api/users", authenticateToken, userRoutes);

// Health check endpoints
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// Enhanced Socket.IO for real-time updates with proper authentication
io.use(authenticateSocket);

// Handle token expiration for active connections
handleTokenExpiration(io);

io.on("connection", (socket) => {
  setupSocketHandlers(socket, io);
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
