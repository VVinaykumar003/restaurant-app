// routes/admin.route.js
const express = require("express");
const router = express.Router({ mergeParams: true });
const adminController = require("../controllers/admin.controller");

// Import middleware
const authMiddleware = require("../common/middlewares/auth.middleware");
const requireRole = require("../common/middlewares/role.middleware");

// defensive imports
let rateLimit = null;
let validate = null;

try {
  rateLimit = require("../common/middlewares/rateLimit.middleware");
} catch (e) {
  console.warn(
    "rateLimit.middleware not available — rate limiting disabled for admin routes."
  );
  rateLimit = {};
}

try {
  validate = require("../common/middlewares/validate.middleware");
} catch (e) {
  console.warn(
    "validate.middleware not available — input validation disabled for admin routes."
  );
  validate = {};
}

// rate-limit helper: map to your exported limiters or no-op
function limiter(mwName) {
  if (!rateLimit || !rateLimit[mwName]) {
    return (req, res, next) => next();
  }
  return rateLimit[mwName];
}

/**
 * Router-level request logger for admin routes
 * - logs method, path, rid and x-request-id (if provided)
 * - does not print sensitive info
 */
router.use((req, res, next) => {
  try {
    const now = new Date().toISOString();
    const reqId = req.header("x-request-id") || req.requestId || null;
    const method = req.method;
    const path = req.originalUrl || req.url;
    const rid = req.params?.rid || null;

    // use console.info so these show up at info level
    console.info(`[${now}] [admin.route] Enter`, {
      reqId,
      method,
      path,
      rid,
    });
  } catch (e) {
    // don't break routes because of logging
    console.warn("[admin.route] route logger failed", e && e.message);
  }
  return next();
});

// --- Public routes ---

// Admin login (admin PIN) - sensitiveLimiter
// POST /api/:rid/admin/login
router.post("/login", limiter("sensitiveLimiter"), adminController.login);

// Staff login (shared staff PIN) - staffLimiter
// POST /api/:rid/auth/staff-login
router.post(
  "/auth/staff-login",
  limiter("staffLimiter"),
  adminController.staffLogin
);

// GET /api/:rid/admin/menu (public read)
router.get("/menu", adminController.getMenu);

// Generate override token via PIN (no JWT required; controller verifies PIN).
// Rate limit to sensitiveLimiter
router.post(
  "/overrides",
  limiter("sensitiveLimiter"),
  adminController.generateOverrideToken
);

// --- Protected admin routes (require admin JWT / role) ---
// Each protected route explicitly mounts authMiddleware then requireRole('admin')
// This avoids accidental public-route skipping or middleware-order issues.

/**
 * Update menu (admin)
 * POST /api/:rid/admin/menu
 */
router.post(
  "/menu",
  authMiddleware,
  requireRole("admin"),
  adminController.updateMenu
);

/**
 * Add single menu item (admin)
 * POST /api/:rid/admin/menu/items
 */
router.post(
  "/menu/items",
  authMiddleware,
  requireRole("admin"),
  adminController.addMenuItem
);

/**
 * Analytics and export (admin)
 */
router.get(
  "/analytics",
  authMiddleware,
  requireRole("admin"),
  adminController.getAnalytics
);
router.post(
  "/export",
  authMiddleware,
  requireRole("admin"),
  adminController.exportReport
);

/**
 * Table management (admin)
 */
router.patch(
  "/tables/:id",
  authMiddleware,
  requireRole("admin"),
  adminController.updateTable
);

/**
 * PIN management (admin)
 */
router.patch(
  "/pin",
  authMiddleware,
  requireRole("admin"),
  limiter("sensitiveLimiter"),
  adminController.updatePin
);

/**
 * Staff aliases management (admin)
 */
router.patch(
  "/staff-aliases",
  authMiddleware,
  requireRole("admin"),
  adminController.updateStaffAliases
);

/**
 * Update global config (taxPercent, discount, serviceCharge) - admin
 */
router.patch(
  "/config",
  authMiddleware,
  requireRole("admin"),
  adminController.updateConfig
);

/**
 * Reopen finalized bill (admin override) - admin
 */
router.post(
  "/bills/:billId/reopen",
  authMiddleware,
  requireRole("admin"),
  adminController.reopenBill
);

// Export the router
module.exports = router;
