/**
 * Environment configuration validation
 * Ensures all required environment variables are present
 */

const requiredEnvVars = ["JWT_SECRET", "JWT_REFRESH_SECRET", "MONGODB_URI"];

const optionalEnvVars = {
  PORT: "5000",
  NODE_ENV: "development",
  CLIENT_URL: "http://localhost:3000",
  JWT_EXPIRES_IN: "15m",
  JWT_REFRESH_EXPIRES_IN: "7d",
  RATE_LIMIT_MAX: "1000",
  RATE_LIMIT_WINDOW_MS: "900000",
};

/**
 * Validates that all required environment variables are present
 * @throws {Error} If any required environment variable is missing
 */
function validateEnvironment() {
  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}\n` +
        "Please create a .env file based on .env.example"
    );
  }

  // Set default values for optional environment variables
  Object.entries(optionalEnvVars).forEach(([key, defaultValue]) => {
    if (!process.env[key]) {
      process.env[key] = defaultValue;
    }
  });

  // Validate JWT secrets are long enough
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long");
  }

  if (process.env.JWT_REFRESH_SECRET.length < 32) {
    throw new Error("JWT_REFRESH_SECRET must be at least 32 characters long");
  }

  console.log("✅ Environment configuration validated successfully");
}

module.exports = {
  validateEnvironment,
  requiredEnvVars,
  optionalEnvVars,
};
