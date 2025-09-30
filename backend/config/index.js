// config/index.js
// Centralized environment config loader with validation and sane defaults.

require("dotenv").config();

const env = (name, fallback = undefined) => {
  const v = process.env[name];
  return typeof v === "undefined" ? fallback : v;
};

const parseIntEnv = (name, fallback) => {
  const v = env(name);
  if (typeof v === "undefined" || v === "") return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
};

const parseBoolEnv = (name, fallback) => {
  const v = env(name);
  if (typeof v === "undefined" || v === "") return fallback;
  return /^(1|true|yes)$/i.test(String(v).trim());
};

// Core
const NODE_ENV = env("NODE_ENV", "development");
const IS_PROD = NODE_ENV === "production";

const config = {
  nodeEnv: NODE_ENV,
  isProduction: IS_PROD,

  // Mongo
  MONGO_URI:
    env("MONGO_URI") ||
    env("MONGODB_URI") ||
    "mongodb://127.0.0.1:27017/swadsetu",

 

  // Redis (either REDIS_URL or host/port/password)
  REDIS_URL: env("REDIS_URL", null),
  REDIS_HOST: env("REDIS_HOST", "127.0.0.1"),
  REDIS_PORT: parseIntEnv("REDIS_PORT", 6379),
  REDIS_PASSWORD: env("REDIS_PASSWORD", null), 

  PORT: parseIntEnv("PORT", 5000),

  // Security
  JWT_SECRET: env("JWT_SECRET", ""),
  BCRYPT_ROUNDS: parseIntEnv("BCRYPT_ROUNDS", 10),
  OVERRIDE_TOKEN_TTL_MIN: parseIntEnv("OVERRIDE_TOKEN_TTL_MIN", 10),

  // App defaults
  DEFAULT_RESTAURANT_ID: env("DEFAULT_RESTAURANT_ID", "restro10"),
  DEFAULT_ADMIN_PIN: env("DEFAULT_ADMIN_PIN", "1111"),

  // Session / business configuration
  SESSION_TTL_MS: parseIntEnv("SESSION_TTL_MS", 1000 * 60 * 60), // 1 hour
  SERVICE_CHARGE_DEFAULT: parseIntEnv("SERVICE_CHARGE_DEFAULT", 0),

  // Rate limiting / throttles
  RATE_LIMIT_WINDOW_MS: parseIntEnv("RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
  RATE_LIMIT_MAX: parseIntEnv("RATE_LIMIT_MAX", 100),

  // Logging
  LOG_LEVEL: env("LOG_LEVEL", "info"),

  // Feature flags
  STAFF_ALIAS_STRICT: parseBoolEnv("STAFF_ALIAS_STRICT", false),

  // Misc
  APP_NAME: env("APP_NAME", "Swad Setu"),
};

// Convenience: build redis connection info if REDIS_URL absent
if (!config.REDIS_URL) {
  const pass = config.REDIS_PASSWORD
    ? `:${encodeURIComponent(config.REDIS_PASSWORD)}@`
    : "";
  config.REDIS_URL = `redis://${pass}${config.REDIS_HOST}:${config.REDIS_PORT}`;
}

// Validation helper - call this in server startup to fail fast if critical envs missing.
function validate(throwOnError = true) {
  const errors = [];

  if (!config.MONGO_URI) errors.push("MONGO_URI is required");
  if (!config.JWT_SECRET || String(config.JWT_SECRET).trim() === "") {
    errors.push("JWT_SECRET is required (set in env)");
  }

  if (IS_PROD) {
    // In production be stricter
    if (config.BCRYPT_ROUNDS < 10) {
      errors.push("BCRYPT_ROUNDS should be >= 10 in production");
    }
    // You may also require a real Redis in production; warn if using in-memory stub
    if (!config.REDIS_URL) {
      errors.push("REDIS_URL not configured for production");
    }
  }

  if (errors.length) {
    const msg = `Configuration validation failed:\n - ${errors.join("\n - ")}`;
    if (throwOnError) {
      throw new Error(msg);
    } else {
      // eslint-disable-next-line no-console
      console.error(msg);
    }
  }

  return true;
}

module.exports = {
  ...config,
  validate,
};
