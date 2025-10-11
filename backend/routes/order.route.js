const express = require("express");
const router = express.Router({ mergeParams: true });
const orderController = require("../controllers/order.controller");

// defensive imports for auth, rate limit and validate
let authMiddleware = null;
let rateLimit = null;
let validate = null;

try {
  authMiddleware = require("../common/middlewares/auth.middleware");
} catch (e) {
  console.warn(
    "auth.middleware not available — staff routes will error in production."
  );
}

try {
  rateLimit = require("../common/middlewares/rateLimit.middleware");
} catch (e) {
  console.warn(
    "rateLimit.middleware not available — rate limiting disabled for order routes."
  );
  rateLimit = {};
}

try {
  validate = require("../common/middlewares/validate.middleware");
} catch (e) {
  console.warn(
    "validate.middleware not available — input validation disabled for order routes."
  );
  validate = {};
}

// helper to require a role (staff or admin)
function requireRole(role) {
  return (req, res, next) => {
    if (!authMiddleware) {
      const err = new Error("auth.middleware required but not found.");
      err.status = 500;
      return next(err);
    }
    // ensure auth ran
    if (!req.user) {
      return authMiddleware(req, res, (err) => {
        if (err) return next(err);
        const userRole =
          (req.user && (req.user.role || req.user.roles)) || null;
        if (!userRole)
          return res.status(403).json({ error: "Forbidden (role missing)" });
        if (userRole === role || userRole === "admin") return next();
        return res.status(403).json({ error: "Forbidden (insufficient role)" });
      });
    }
    const userRole = (req.user && (req.user.role || req.user.roles)) || null;
    if (!userRole)
      return res.status(403).json({ error: "Forbidden (role missing)" });
    if (userRole === role || userRole === "admin") return next();
    return res.status(403).json({ error: "Forbidden (insufficient role)" });
  };
}

// map limiter names to functions or no-op
function limiter(name) {
  if (!rateLimit || !rateLimit[name]) return (req, res, next) => next();
  return rateLimit[name];
}

/**
 * Routes:
 *
 * POST   /api/:rid/orders            -- public (customer)
 * PATCH  /api/:rid/orders/:id/status -- staff
 * GET    /api/:rid/orders/active     -- staff
 * GET    /api/:rid/orders/history    -- public (customer) - requires sessionId query
 */

// Public: create order (customer)
router.post("/", orderController.createOrder);

// Staff-protected: update order status
router.patch(
  "/:id/status",
  // require staff auth + rate limiting
  [authMiddleware, requireRole("staff"), limiter("staffLimiter")],
  orderController.updateOrderStatus
);

// Staff-protected: get active orders (kitchen/waiter)
router.get(
  "/active",
  [authMiddleware, requireRole("staff"), limiter("staffLimiter")],
  orderController.getActiveOrders
);

// Order history (could be customer or staff): keep public but validate session query on controller side
router.get("/history", orderController.getOrderHistory);


//customer can se the order by ID 
router.get("/:id/order" , orderController.getOrderById);

module.exports = router;
