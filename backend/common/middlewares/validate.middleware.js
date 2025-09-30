// src/common/middlewares/validate.middleware.js
const logger = require("../../common/libs/logger") || console;

// Defensive require for Admin model (optional in early dev)
let Admin = null;
try {
  // adjust this path to where your admin model actually lives
  Admin = require("../../models/admin.model");
} catch (e) {
  logger &&
    logger.warn &&
    logger.warn("Admin model load warning:", e.message || e);
}

// Defensive require for redis helpers (idempotency)
let checkIdempotency = null;
try {
  const redisHelpers = require("../../db/redis");
  checkIdempotency = redisHelpers.checkIdempotency; 
} catch (e) {
  logger &&
    logger.warn &&
    logger.warn("Redis helpers unavailable:", e.message || e);
}

function isNonEmptyString(v, minLen = 1) {
  return typeof v === "string" && v.trim().length >= minLen;
}

function validateRestaurant(req, res, next) {
  const rid = req.params && req.params.rid;
  if (!isNonEmptyString(rid, 3)) {
    return res
      .status(400)
      .json({ error: "Invalid or missing restaurant ID (rid)" });
  }
  req.restaurantId = rid.trim();
  return next();
}

function validateCustomerSession(req, res, next) {
  const sessionId =
    req.body?.sessionId || req.headers["x-session-id"] || req.query?.sessionId;
  if (!isNonEmptyString(sessionId, 5)) {
    return res.status(400).json({ error: "Invalid or missing session ID" });
  }
  req.sessionId = sessionId.trim();
  return next();
}

function validateStaff(req, res, next) {
  const staffAlias =
    req.body?.staffAlias ||
    req.headers["x-staff-alias"] ||
    req.query?.staffAlias;
  if (!isNonEmptyString(staffAlias, 2)) {
    return res.status(400).json({ error: "Invalid or missing staff alias" });
  }
  req.staffAlias = staffAlias.trim();
  return next();
}

async function validateManager(req, res, next) {
  const rid = req.params && req.params.rid;
  const overrideToken =
    req.body?.overrideToken ||
    req.headers["x-override-token"] ||
    req.query?.overrideToken;

  if (!isNonEmptyString(overrideToken, 1)) {
    return res.status(401).json({ error: "Override token required" });
  }

  if (!Admin) {
    logger &&
      logger.warn &&
      logger.warn("validateManager called but Admin model unavailable");
    return res
      .status(501)
      .json({ error: "Manager validation not configured on server" });
  }

  try {
    const admin = await Admin.findOne({ restaurantId: rid }).lean();
    if (!admin || !Array.isArray(admin.overrideTokens)) {
      return res.status(401).json({ error: "Invalid override token" });
    }

    // Find token with matching value and valid expiration
    const tokenObj = admin.overrideTokens.find(
      (t) => t.token === overrideToken && new Date(t.expiresAt) > new Date()
    );

    if (!tokenObj) {
      return res
        .status(401)
        .json({ error: "Invalid or expired override token" });
    }

    // Remove the specific token object
    await Admin.updateOne(
      { restaurantId: rid },
      { $pull: { overrideTokens: { token: overrideToken } } }
    );

    req.managerValidated = true;
    return next();
  } catch (err) {
    logger && logger.error && logger.error("validateManager error:", err);
    return next(err);
  }
}

async function handleIdempotency(req, res, next) {
  const rid = req.params && req.params.rid;
  const sessionId =
    req.body?.sessionId || req.headers["x-session-id"] || req.query?.sessionId;
  const idempotencyKey = req.headers["x-idempotency-key"];

  if (!idempotencyKey || !isNonEmptyString(rid, 1)) return next();

  if (typeof checkIdempotency !== "function") {
    logger &&
      logger.warn &&
      logger.warn("Idempotency requested but checkIdempotency not implemented");
    return next();
  }

  try {
    const key = `idempotency:${rid}:${
      sessionId || "no-session"
    }:${idempotencyKey}`;
    const existing = await checkIdempotency(key);

    if (existing) {
      return res
        .status(409)
        .json({ error: "Duplicate request", data: existing });
    }

    req.idempotencyKey = key;
    return next();
  } catch (err) {
    logger && logger.error && logger.error("handleIdempotency error:", err);
    return next(err);
  }
}

module.exports = {
  validateRestaurant,
  validateCustomerSession,
  validateStaff,
  validateManager,
  handleIdempotency,
};
