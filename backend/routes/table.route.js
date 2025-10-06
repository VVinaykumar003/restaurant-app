const express = require("express");
const router = express.Router({ mergeParams: true });

const tableController = require("../controllers/table.controller");

// Import middleware
const authMiddleware = require("../common/middlewares/auth.middleware");
const requireRole = require("../common/middlewares/role.middleware");

// defensive imports
let rateLimit = null;
let helpers = null;

try {
  rateLimit = require("../common/middlewares/rateLimit.middleware");
} catch (e) {
  console.warn(
    "rateLimit.middleware not found — rate limiting disabled for table routes."
  );
  rateLimit = {};
}

try {
  helpers = require("../common/libs/helpers");
} catch (e) {
  console.warn(
    "common/libs/helpers not found — staffAlias validation unavailable."
  );
  helpers = null;
}

// helper wrappers
function limiter(name) {
  if (!rateLimit || !rateLimit[name]) return (req, res, next) => next();
  return rateLimit[name];
}

// Define role-based middleware
const adminOnly = [authMiddleware, requireRole("admin")];
const staffOrAdmin = [authMiddleware, requireRole(["staff", "admin"])];

// ensureStaffAlias middleware
const ensureStaffAliasMiddleware =
  helpers && typeof helpers.ensureStaffAliasMiddleware === "function"
    ? helpers.ensureStaffAliasMiddleware()
    : (req, res, next) => next();

/** 
 * Routes:
 *
 * POST   /api/:rid/tables            -- Create new table (Admin only)
 * GET    /api/:rid/tables            -- Public (list)
 * GET    /api/:rid/tables/:id        -- Public (detail)
 * PATCH  /api/:rid/tables/:id/status -- Admin/Staff (status update)
 * PATCH  /api/:rid/tables/:id/session -- Staff (assign session to table)
 * PATCH  /api/:rid/tables/:id/staff  -- Staff/Admin (update staff alias)
 * DELETE /api/:rid/tables/:id        -- Admin only
 */

// Create table (admin only) - sensitive action
router.post(
  "/",
  ...adminOnly,
  limiter("sensitiveLimiter"),
  tableController.createTable
);

// Public list
router.get("/", tableController.getTables);

// Public detail
router.get("/:id", tableController.getTableById);

// Update table status (staff or admin) - use rate limiting for staff actions
router.patch(
  "/:id/status",
  [...staffOrAdmin, limiter("staffLimiter")],
  tableController.updateTableStatus
);

// Assign session to table (staff)
router.patch(
  "/:id/session",
  [...staffOrAdmin, limiter("staffLimiter"), ensureStaffAliasMiddleware],
  tableController.assignSession
);

// Update staff alias for table (staff/admin) - validate alias
router.patch(
  "/:id/staff",
  [...staffOrAdmin, limiter("staffLimiter"), ensureStaffAliasMiddleware],
  tableController.updateStaffAlias
);

// Delete table (admin only)
router.delete(
  "/:id",
  ...adminOnly,
  limiter("sensitiveLimiter"),
  tableController.deleteTable
);

module.exports = router;
