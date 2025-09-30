// controllers/order.controller.js
// Upgraded: priceAtOrder, optimistic locking (version), status canonicalization,
// idempotency-friendly, defensive Redis/publish helpers.

const Order = require("../models/order.model");
const Menu = (() => {
  try {
    return require("../models/menu.model");
  } catch (e) {
    return null;
  }
})();
const Admin = (() => {
  try {
    return require("../models/admin.model");
  } catch (e) {
    return null;
  }
})();

const { getPricingConfig } = require("../common/libs/pricingHelper");

// Defensive logger
let logger = console;
try {
  logger = require("../common/libs/logger") || console;
} catch (e) {
  console.warn("Logger not found, using console as fallback.");
}

// Defensive load for Redis helpers (checkIdempotency, publishEvent, lock)
let checkIdempotency = null;
let publishEvent = null;
let redisLock = null;
(function tryLoadRedisHelpers() {
  const candidates = [
    "../db/redis",
    "../db/redis.helpers",
    "../db/redisHelper",
    "../../db/redis",
    "../../db/redis.helpers",
  ];

  for (const p of candidates) {
    try {
      const mod = require(p);
      if (!mod) continue;

      if (!checkIdempotency) {
        checkIdempotency =
          mod.checkIdempotency ||
          mod.check_idempotency ||
          (typeof mod === "function" ? mod : null);
      }

      if (!publishEvent) {
        publishEvent =
          mod.publishEvent ||
          mod.publish ||
          (typeof mod === "function" ? mod : null);
      }

      // optional distributed lock helper (setLock, releaseLock) if implemented
      if (!redisLock) {
        redisLock = mod.acquireLock || mod.setLock || mod.lock || null;
        // release counterpart
        redisLock =
          redisLock && typeof redisLock === "function"
            ? mod
            : redisLock
            ? mod
            : null;
      }

      if (checkIdempotency || publishEvent) break;
    } catch (err) {
      // ignore
    }
  }

  if (!checkIdempotency) {
    logger &&
      logger.warn &&
      logger.warn(
        "checkIdempotency not found; idempotency checks will be skipped."
      );
    checkIdempotency = null;
  }
  if (!publishEvent) {
    logger &&
      logger.warn &&
      logger.warn(
        "publishEvent not found; publish notifications will be no-op."
      );
    publishEvent = null;
  }
})();

// Safe wrappers
async function safeCheckIdempotency(key) {
  if (typeof checkIdempotency !== "function") return null;
  try {
    return await checkIdempotency(key);
  } catch (err) {
    logger && logger.error && logger.error("checkIdempotency error:", err);
    return null;
  }
}

function safePublish(channel, message) {
  if (typeof publishEvent !== "function") return;
  try {
    const out = publishEvent(channel, message);
    if (out && typeof out.then === "function") {
      out.catch((err) => {
        logger &&
          logger.error &&
          logger.error("publishEvent promise rejected:", err);
      });
    }
  } catch (err) {
    logger && logger.error && logger.error("publishEvent error:", err);
  }
}

// Helper - canonicalize status inputs
const STATUS_MAP = {
  pending: "placed",
  placed: "placed",
  accepted: "accepted",
  preparing: "preparing",
  ready: "done",
  done: "done",
  served: "done",
};

// Create new order
async function createOrder(req, res, next) {
  try {
    const { rid } = req.params;
    const {
      tableId,
      sessionId,
      items,
      isCustomerOrder,
      staffAlias,
      customerName,
      customerContact,
      customerEmail,
    } = req.body;

    if (
      !rid ||
      !tableId ||
      !sessionId ||
      !Array.isArray(items) ||
      !items.length ||
      !customerName
    ) {
      return res.status(400).json({
        error:
          "Missing required fields: tableId, sessionId, items, customerName",
      });
    }

    // Idempotency header support (x-idempotency-key)
    const headerKey =
      req.headers["x-idempotency-key"] || req.headers["x-idempotency"];
    const idempotencyKey = headerKey
      ? `idempotency:order:${rid}:${sessionId}:${headerKey}`
      : null;
    if (idempotencyKey) {
      const existing = await safeCheckIdempotency(idempotencyKey);
      if (existing) {
        return res
          .status(409)
          .json({ error: "Duplicate request", order: existing });
      }
    }

    // Build order items with server-side priceAtOrder lookup
    const mongoose = require("mongoose");
    // Validate and build order items
    const resolvedItems = [];
    for (const [index, item] of items.entries()) {
      // Support both "menuItemId" and "itemId" for backward compatibility
      const menuItemId = item.menuItemId || item.itemId;

      // Validate menu item ID presence
      if (!menuItemId) {
        return res.status(400).json({
          error: `Missing menu item ID for item at position ${index}. Please use "menuItemId" field.`,
        });
      }

      // Warn about deprecated "itemId" field
      if (item.itemId) {
        logger &&
          logger.warn &&
          logger.warn(
            `Using deprecated "itemId" field. Please migrate to "menuItemId".`
          );
      }

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(menuItemId)) {
        return res.status(400).json({
          error: `Invalid ObjectId format for menu item at position ${index}: ${menuItemId}`,
        });
      }

      // Look up menu item
      let menuItem = null;
      try {
        // Find active menu for restaurant
        const menuDoc = await Menu.findOne({
          restaurantId: rid,
          isActive: true,
        });

        // Find menu item by ObjectId
        if (menuDoc && Array.isArray(menuDoc.items)) {
          menuItem = menuDoc.items.find(
            (m) => String(m._id) === String(menuItemId)
          );
        }

        if (!menuItem) {
          return res.status(400).json({
            error: `Menu item not found for id: ${item.menuItemId}`,
          });
        }
      } catch (e) {
        logger && logger.warn && logger.warn("Menu lookup failed:", e);
        return res.status(500).json({ error: "Failed to look up menu items" });
      }

      resolvedItems.push({
        menuItemId: new mongoose.Types.ObjectId(menuItemId),
        name: menuItem.name,
        quantity: Math.max(1, Number(item.quantity) || 1),
        priceAtOrder: menuItem.price,
      });
    }

    // compute total server-side
    const totalAmount = resolvedItems.reduce(
      (s, it) => s + it.priceAtOrder * it.quantity,
      0
    );

    const finalIsCustomerOrder =
      typeof isCustomerOrder === "boolean" ? isCustomerOrder : true;

    const orderDoc = new Order({
      restaurantId: rid,
      tableId,
      sessionId,
      items: resolvedItems,
      totalAmount,
      isCustomerOrder: finalIsCustomerOrder,
      staffAlias: staffAlias || null,
      customerName,
      customerContact: customerContact || undefined,
      customerEmail: customerEmail || undefined,
      status: "placed",
      version: 1,
    });

    await orderDoc.save();

    // Calculate pre-bill using pricing config
    const { taxes, serviceCharge, globalDiscountPercent } =
      await getPricingConfig(rid);

    // Apply global discount
    const discountAmount = (totalAmount * globalDiscountPercent) / 100;
    const amountAfterDiscount = totalAmount - discountAmount;

    // Calculate taxes
    const taxBreakdown = [];
    let totalTax = 0;
    for (const tax of taxes) {
      const taxAmount = (amountAfterDiscount * tax.percent) / 100;
      taxBreakdown.push({
        name: tax.name || "Tax",
        rate: tax.percent,
        amount: taxAmount,
      });
      totalTax += taxAmount;
    }

    // Calculate service charge
    const serviceChargeAmount = (amountAfterDiscount * serviceCharge) / 100;

    // Calculate total
    const total = amountAfterDiscount + totalTax + serviceChargeAmount;

    const preBill = {
      subtotal: totalAmount,
      taxes: taxBreakdown,
      serviceCharge: serviceChargeAmount,
      discount: discountAmount,
      total,
    };

    // publish
    safePublish(`restaurant:${rid}:staff`, {
      event: "orderCreated",
      data: orderDoc,
    });

    return res.status(201).json({ order: orderDoc, preBill });
  } catch (error) {
    logger && logger.error && logger.error("Order creation error:", error);
    return next(error);
  }
}

// Update order status with optimistic locking
async function updateOrderStatus(req, res, next) {
  try {
    const { rid, id } = req.params;
    const { status, staffAlias, version } = req.body;

    if (!rid || !id || !status)
      return res.status(400).json({ error: "Missing parameters" });

    const canonicalStatus =
      STATUS_MAP[(status || "").toString().toLowerCase()] || status;

    // optimistic locking: require version
    if (typeof version === "undefined") {
      // If client didn't send version, still attempt update but warn: better to require version
      logger &&
        logger.warn &&
        logger.warn(
          "updateOrderStatus called without version; consider sending version for optimistic locking"
        );
    }

    // Build update document
    const update = {
      status: canonicalStatus,
      staffAlias: staffAlias || null,
      updatedAt: Date.now(),
    };

    let order;
    if (typeof version !== "undefined") {
      order = await Order.findOneAndUpdate(
        { _id: id, restaurantId: rid, version: version },
        { $set: update, $inc: { version: 1 } },
        { new: true }
      );
      if (!order) {
        const current = await Order.findOne({
          _id: id,
          restaurantId: rid,
        }).lean();
        return res.status(409).json({ error: "Version mismatch", current });
      }
    } else {
      // no version provided: do simple update and increment version
      order = await Order.findOneAndUpdate(
        { _id: id, restaurantId: rid },
        { $set: update, $inc: { version: 1 } },
        { new: true }
      );
    }

    safePublish(`restaurant:${rid}:tables:${order.tableId}`, {
      event: "orderUpdated",
      data: order,
    });

    return res.json(order);
  } catch (error) {
    logger && logger.error && logger.error("Order status update error:", error);
    return next(error);
  }
}

// Get active orders (staff view)
async function getActiveOrders(req, res, next) {
  try {
    const { rid } = req.params;
    // use canonical active statuses
    const orders = await Order.find({
      restaurantId: rid,
      status: { $in: ["placed", "accepted", "preparing"] },
    }).sort({ createdAt: -1 });

    return res.json(orders);
  } catch (error) {
    logger && logger.error && logger.error("Active orders fetch error:", error);
    return next(error);
  }
}

// Get order history for session
async function getOrderHistory(req, res, next) {
  try {
    const { rid } = req.params;
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID required" });
    }

    const orders = await Order.find({
      restaurantId: rid,
      sessionId,
      status: "done",
    }).sort({ createdAt: -1 });

    return res.json(orders);
  } catch (error) {
    logger && logger.error && logger.error("Order history fetch error:", error);
    return next(error);
  }
}

module.exports = {
  createOrder,
  updateOrderStatus,
  getActiveOrders,
  getOrderHistory,
};
