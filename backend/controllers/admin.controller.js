// controllers/admin.controller.js
// Hardened admin controller with Menu extraction support and staff/login/config fixes.
// Enhanced with detailed step-by-step logging for easier debugging and data-flow tracing.

const Admin = require("../models/admin.model");
const bcrypt = require("bcrypt");
const { generateToken } = require("../common/libs/jwt");
const Order = require("../models/order.model");
const Bill = require("../models/bill.model");
const crypto = require("crypto");
const mongoose = require("mongoose");

// Defensive logger (fallback to console)
let logger = console;
try {
  logger = require("../common/libs/logger") || console;
} catch (e) {
  console.warn("Logger not found, using console as fallback.");
}

// Defensive publishEvent loader
let publishEvent = null;
try {
  const redisModule =
    require("../db/redis") ||
    require("../db/redis.helpers") ||
    require("../db/redisHelper") ||
    null;
  if (redisModule) {
    publishEvent =
      redisModule.publishEvent ||
      redisModule.publish ||
      (typeof redisModule === "function" ? redisModule : null);
  }
  if (typeof publishEvent !== "function") {
    publishEvent = null;
    logger &&
      logger.warn &&
      logger.warn("publishEvent not available — realtime publish no-op.");
  } else {
    logger && logger.info && logger.info("publishEvent loaded successfully.");
  }
} catch (e) {
  publishEvent = null;
  logger &&
    logger.warn &&
    logger.warn("Redis publish helper load failed:", e && e.message);
}

function safePublish(channel, message) {
  if (typeof publishEvent !== "function") {
    logger &&
      logger.debug &&
      logger.debug("safePublish: publishEvent not configured.");
    return;
  }
  try {
    logger &&
      logger.debug &&
      logger.debug("safePublish: publishing", { channel, message });
    const res = publishEvent(channel, message);
    if (res && typeof res.then === "function")
      res.catch((err) => {
        logger &&
          logger.error &&
          logger.error("publishEvent promise rejected:", err && err.message);
      });
  } catch (err) {
    logger &&
      logger.error &&
      logger.error("publishEvent error:", err && err.message);
  }
}

function sanitizeAdmin(adminDoc) {
  if (!adminDoc) return null;
  const obj = adminDoc.toObject ? adminDoc.toObject() : { ...adminDoc };
  // remove all sensitive fields
  delete obj.hashedPin;
  delete obj.staffHashedPin;
  delete obj.overrideTokens;
  return obj;
}

function getBcryptRounds() {
  const env = parseInt(process.env.BCRYPT_ROUNDS || "", 10);
  const rounds = Number.isFinite(env) && env > 0 ? env : 10;
  logger && logger.debug && logger.debug("Using bcrypt rounds:", rounds);
  return rounds;
}

// Defensive Menu model require (may not exist during migration)
let Menu = null;
try {
  Menu = require("../models/menu.model");
  logger && logger.info && logger.info("Menu model loaded.");
} catch (e) {
  Menu = null;
  logger &&
    logger.info &&
    logger.info("Menu model not found — menus unavailable until migrated.");
}

// ----------------------- Controllers -----------------------

/**
 * Admin login (admin PIN)
 * POST /api/:rid/admin/login
 */
async function login(req, res, next) {
  logger &&
    logger.info &&
    logger.info("Enter admin.login", { params: req.params });
  try {
    const { rid } = req.params;
    const { pin } = req.body || {};

    if (!rid) {
      logger && logger.warn && logger.warn("admin.login missing rid");
      return res.status(400).json({ error: "Missing restaurant id (rid)" });
    }
    if (!pin || typeof pin !== "string") {
      logger &&
        logger.warn &&
        logger.warn("admin.login missing or invalid pin (redacted)");
      return res.status(400).json({ error: "PIN required" });
    }

    logger &&
      logger.debug &&
      logger.debug("admin.login looking up Admin", { restaurantId: rid });
    const admin = await Admin.findOne({ restaurantId: rid }).lean();
    if (!admin) {
      logger &&
        logger.warn &&
        logger.warn("admin.login admin config not found", {
          restaurantId: rid,
        });
      return res.status(404).json({ error: "Admin configuration not found" });
    }

    logger &&
      logger.debug &&
      logger.debug("admin.login comparing PIN (redacted)");
    const isMatch = await bcrypt.compare(pin, admin.hashedPin || "");
    if (!isMatch) {
      logger &&
        logger.warn &&
        logger.warn("admin.login invalid PIN attempt", { restaurantId: rid });
      return res.status(401).json({ error: "Invalid PIN" });
    }

    logger &&
      logger.info &&
      logger.info("admin.login PIN validated, issuing token", {
        restaurantId: rid,
      });
    const token = generateToken(
      { restaurantId: rid, role: "admin" },
      { expiresIn: "1h" }
    );

    logger &&
      logger.debug &&
      logger.debug("admin.login token generated (redacted)", {
        restaurantId: rid,
      });
    return res.json({ token });
  } catch (err) {
    logger &&
      logger.error &&
      logger.error("Admin login error:", err && err.stack ? err.stack : err);
    return next(err);
  }
}

/**
 * Staff login (shared staff PIN or fallback to admin PIN)
 * POST /api/:rid/auth/staff-login
 */
async function staffLogin(req, res, next) {
  logger &&
    logger.info &&
    logger.info("Enter staffLogin", { params: req.params });
  try {
    const { rid } = req.params;
    const { pin } = req.body || {};

    if (!rid) {
      logger && logger.warn && logger.warn("staffLogin missing rid");
      return res.status(400).json({ error: "Missing restaurant id (rid)" });
    }
    if (!pin || typeof pin !== "string") {
      logger &&
        logger.warn &&
        logger.warn("staffLogin missing or invalid pin (redacted)");
      return res.status(400).json({ error: "PIN required" });
    }

    logger &&
      logger.debug &&
      logger.debug("staffLogin looking up Admin", { restaurantId: rid });
    const admin = await Admin.findOne({ restaurantId: rid }).lean();
    if (!admin) {
      logger &&
        logger.warn &&
        logger.warn("staffLogin admin config not found", { restaurantId: rid });
      return res.status(404).json({ error: "Admin configuration not found" });
    }

    const staffHash = admin.staffHashedPin || "";
    const adminHash = admin.hashedPin || "";
    logger &&
      logger.debug &&
      logger.debug("staffLogin checking staffHash presence", {
        hasStaffHash: !!staffHash,
      });

    // Prefer staff pin match; allow admin pin as fallback for convenience
    let matched = false;
    if (staffHash) {
      logger &&
        logger.debug &&
        logger.debug("staffLogin comparing staff PIN (redacted)");
      matched = await bcrypt.compare(pin, staffHash);
      logger &&
        logger.debug &&
        logger.debug("staffLogin staff PIN match result", { matched });
    }
    if (!matched && adminHash) {
      logger &&
        logger.debug &&
        logger.debug("staffLogin fallback compare admin PIN (redacted)");
      matched = await bcrypt.compare(pin, adminHash);
      logger &&
        logger.debug &&
        logger.debug("staffLogin admin PIN fallback match result", { matched });
    }

    if (!matched) {
      logger &&
        logger.warn &&
        logger.warn("staffLogin invalid PIN", { restaurantId: rid });
      return res.status(401).json({ error: "Invalid PIN" });
    }

    logger &&
      logger.info &&
      logger.info("staffLogin PIN validated, issuing staff token", {
        restaurantId: rid,
      });
    const token = generateToken(
      { restaurantId: rid, role: "staff" },
      { expiresIn: "8h" }
    );

    return res.json({ token });
  } catch (err) {
    logger &&
      logger.error &&
      logger.error("Staff login error:", err && err.stack ? err.stack : err);
    return next(err);
  }
}

/**
 * Generate short-lived override token (admin PIN required)
 * POST /api/:rid/admin/overrides
 */
async function generateOverrideToken(req, res, next) {
  logger &&
    logger.info &&
    logger.info("Enter generateOverrideToken", { params: req.params });
  try {
    const { rid } = req.params;
    const { pin } = req.body || {};

    if (!rid) {
      logger && logger.warn && logger.warn("generateOverrideToken missing rid");
      return res.status(400).json({ error: "Missing restaurant id (rid)" });
    }
    if (!pin || typeof pin !== "string") {
      logger &&
        logger.warn &&
        logger.warn("generateOverrideToken missing or invalid pin (redacted)");
      return res.status(400).json({ error: "PIN required" });
    }

    logger &&
      logger.debug &&
      logger.debug("generateOverrideToken finding admin", {
        restaurantId: rid,
      });
    const admin = await Admin.findOne({ restaurantId: rid });
    if (!admin) {
      logger &&
        logger.warn &&
        logger.warn("generateOverrideToken admin not found", {
          restaurantId: rid,
        });
      return res.status(404).json({ error: "Admin configuration not found" });
    }

    logger &&
      logger.debug &&
      logger.debug("generateOverrideToken comparing PIN (redacted)");
    const isMatch = await bcrypt.compare(pin, admin.hashedPin || "");
    if (!isMatch) {
      logger &&
        logger.warn &&
        logger.warn("generateOverrideToken invalid current PIN", {
          restaurantId: rid,
        });
      return res.status(401).json({ error: "Invalid PIN" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const ttlMinutes =
      parseInt(process.env.OVERRIDE_TOKEN_TTL_MIN || "10", 10) || 10;
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    logger &&
      logger.debug &&
      logger.debug("generateOverrideToken normalizing existing tokens");
    admin.overrideTokens = (admin.overrideTokens || []).filter((t) => {
      try {
        if (!t) return false;
        // If legacy stored as string skip it (we won't accept legacy format)
        if (typeof t === "string") return false;
        if (!t.expiresAt) return false;
        return new Date(t.expiresAt) > new Date();
      } catch (e) {
        return false;
      }
    });

    admin.overrideTokens = admin.overrideTokens || [];
    admin.overrideTokens.push({ token, createdAt: new Date(), expiresAt });
    logger &&
      logger.info &&
      logger.info(
        "generateOverrideToken saving admin with new override token (redacted)",
        { restaurantId: rid, expiresAt }
      );
    await admin.save();

    safePublish(`restaurant:${rid}:staff`, {
      event: "overrideTokenCreated",
      data: { expiresAt },
    });

    logger &&
      logger.debug &&
      logger.debug("generateOverrideToken completed", { restaurantId: rid });
    // Do NOT return the raw token in logs - but we must in API response for client use.
    return res.json({ token, expiresAt });
  } catch (err) {
    logger &&
      logger.error &&
      logger.error(
        "Generate override token error:",
        err && err.stack ? err.stack : err
      );
    return next(err);
  }
}

/**
 * Get Menu (public)
 * GET /api/:rid/admin/menu
 *
 * NOTE: Menu is sourced from the Menu collection (single source of truth).
 * If Menu collection/document isn't present, return 404 with guidance.
 */
async function getMenu(req, res, next) {
  logger && logger.info && logger.info("Enter getMenu", { params: req.params });
  try {
    const { rid } = req.params;
    if (!rid) {
      logger && logger.warn && logger.warn("getMenu missing rid");
      return res.status(400).json({ error: "Missing restaurant id (rid)" });
    }

    // Try Menu collection (preferred)
    if (Menu) {
      logger &&
        logger.debug &&
        logger.debug("getMenu querying Menu collection", { restaurantId: rid });
      const menuDoc = await Menu.findOne({
        restaurantId: rid,
        isActive: true,
      }).lean();
      if (menuDoc) {
        logger &&
          logger.info &&
          logger.info("getMenu found active menu", {
            restaurantId: rid,
            version: menuDoc.version,
          });
        return res.json({
          menu: menuDoc.items || [],
          categories: menuDoc.categories || [],
          taxes: menuDoc.taxes || [],
          serviceCharge: menuDoc.serviceCharge || 0,
          branding: menuDoc.branding || {},
        });
      } else {
        logger &&
          logger.info &&
          logger.info("getMenu no active menu found", { restaurantId: rid });
      }
    } else {
      logger && logger.info && logger.info("getMenu Menu model not available");
    }

    // No menu found
    return res.status(404).json({
      error:
        "Menu not configured for this restaurant. Please create an admin menu via POST /api/:rid/admin/menu",
    });
  } catch (err) {
    logger &&
      logger.error &&
      logger.error("Get menu error:", err && err.stack ? err.stack : err);
    return next(err);
  }
}

/**
 * Update Menu (admin protected)
 * POST /api/:rid/admin/menu
 *
 * Writes to Menu collection only. Admin document is ensured to exist (no menu copy).
 */
async function updateMenu(req, res, next) {
  logger &&
    logger.info &&
    logger.info("Enter updateMenu", { params: req.params });
  try {
    const { rid } = req.params;
    const incoming = req.body || {};

    if (!rid) {
      logger && logger.warn && logger.warn("updateMenu missing rid");
      return res.status(400).json({ error: "Missing restaurant id (rid)" });
    }

    logger &&
      logger.debug &&
      logger.debug("updateMenu incoming body keys", Object.keys(incoming));

    // Prepare update fields (only set provided)
    const updateFields = {};
    if (typeof incoming.menu !== "undefined")
      updateFields.items = incoming.menu;
    if (typeof incoming.categories !== "undefined")
      updateFields.categories = incoming.categories;
    if (typeof incoming.taxes !== "undefined")
      updateFields.taxes = incoming.taxes;
    if (typeof incoming.serviceCharge !== "undefined")
      updateFields.serviceCharge = incoming.serviceCharge;
    if (typeof incoming.branding !== "undefined")
      updateFields.branding = incoming.branding;

    logger &&
      logger.debug &&
      logger.debug(
        "updateMenu prepared updateFields keys",
        Object.keys(updateFields)
      );

    let menuResult = null;
    if (Menu) {
      // try to find active menu for this restaurant
      logger &&
        logger.debug &&
        logger.debug("updateMenu searching for existing active menu", {
          restaurantId: rid,
        });
      let menuDoc = await Menu.findOne({ restaurantId: rid, isActive: true });
      if (menuDoc) {
        logger &&
          logger.info &&
          logger.info("updateMenu found active menu, applying updates", {
            menuId: menuDoc._id,
          });
        // apply only provided fields
        Object.assign(menuDoc, updateFields);
        menuDoc.updatedAt = Date.now();
        menuResult = await menuDoc.save();
        logger &&
          logger.info &&
          logger.info("updateMenu saved updated menu", {
            menuId: menuResult._id,
          });
      } else {
        logger &&
          logger.info &&
          logger.info("updateMenu no active menu found, creating new menu", {
            restaurantId: rid,
          });
        // create new active menu; pick version = highest+1 or 1
        const last = await Menu.findOne({ restaurantId: rid })
          .sort({ version: -1 })
          .lean();
        const version = last && last.version ? last.version + 1 : 1;
        const newDoc = {
          restaurantId: rid,
          version,
          isActive: true,
          title: incoming.title || `${rid} menu`,
          items: updateFields.items || [],
          categories: updateFields.categories || [],
          taxes: updateFields.taxes || [],
          serviceCharge:
            typeof updateFields.serviceCharge !== "undefined"
              ? updateFields.serviceCharge
              : 0,
          branding: updateFields.branding || {},
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        menuResult = await Menu.create(newDoc);
        logger &&
          logger.info &&
          logger.info("updateMenu created new menu", {
            menuId: menuResult._id,
            version,
          });
      }
    } else {
      // Menu model not available - cannot update menu collection
      logger &&
        logger.warn &&
        logger.warn("updateMenu failed: Menu collection not available");
      return res
        .status(501)
        .json({ error: "Menu collection not available on server." });
    }

    // Ensure Admin exists minimally (do not copy menu into Admin)
    logger &&
      logger.debug &&
      logger.debug("updateMenu ensuring admin exists for restaurant", {
        restaurantId: rid,
      });
    await Admin.updateOne(
      { restaurantId: rid },
      {
        $setOnInsert: { restaurantId: rid, hashedPin: "" },
        $set: { updatedAt: Date.now() },
      },
      { upsert: true }
    );

    safePublish(`restaurant:${rid}:staff`, {
      event: "menuUpdated",
      data: { timestamp: new Date() },
    });

    logger &&
      logger.info &&
      logger.info("updateMenu returning updated menu to client", {
        restaurantId: rid,
      });
    return res.json({
      menu: menuResult.items || [],
      categories: menuResult.categories || [],
      taxes: menuResult.taxes || [],
      serviceCharge: menuResult.serviceCharge || 0,
      branding: menuResult.branding || {},
    });
  } catch (err) {
    logger &&
      logger.error &&
      logger.error("Update menu error:", err && err.stack ? err.stack : err);
    return next(err);
  }
}

/**
 * Add a single menu item (admin)
 * POST /api/:rid/admin/menu/items
 */
/**
/**
 * Add a single menu item (admin)
 * POST /api/:rid/admin/menu/items
 */
async function addMenuItem(req, res, next) {
  logger &&
    logger.info &&
    logger.info("Enter addMenuItem", { params: req.params });
  try {
    const { rid } = req.params;
    const { item } = req.body || {};
    if (!rid) {
      logger && logger.warn && logger.warn("addMenuItem missing rid");
      return res.status(400).json({ error: "Missing restaurant id (rid)" });
    }
    if (!item || typeof item !== "object") {
      logger &&
        logger.warn &&
        logger.warn("addMenuItem missing or invalid item");
      return res.status(400).json({ error: "Valid menu item required" });
    }

    // minimal validation
    if (!item.name || typeof item.name !== "string") {
      logger && logger.warn && logger.warn("addMenuItem missing item.name");
      return res.status(400).json({ error: "Item name required" });
    }
    if (typeof item.price !== "number") {
      logger &&
        logger.warn &&
        logger.warn("addMenuItem missing item.price or invalid type");
      return res.status(400).json({ error: "Item price required (number)" });
    }
    const categoryName =
      item.category && typeof item.category === "string"
        ? item.category
        : "Uncategorized";

    // generate itemId — CORRECT: construct ObjectId with `new`
    // use toHexString() to get the canonical 24-char hex string
    const itemId =
      item.itemId && typeof item.itemId === "string"
        ? item.itemId
        : `i_${new mongoose.Types.ObjectId().toHexString()}`;

    const newItem = {
      itemId,
      name: item.name,
      description: item.description || "",
      price: item.price,
      currency: item.currency || "INR",
      image: item.image || null,
      isActive: typeof item.isActive === "boolean" ? item.isActive : true,
      isVegetarian: !!item.isVegetarian,
      preparationTime:
        typeof item.preparationTime === "number" ? item.preparationTime : null,
      metadata: item.metadata || {},
    };

    logger &&
      logger.debug &&
      logger.debug("addMenuItem prepared newItem (redacted)", {
        restaurantId: rid,
        itemId,
        name: newItem.name,
      });

    // Prepare a safe upsert update object (no updatedAt in $setOnInsert to avoid conflicts)
    const upsertUpdate = {
      $setOnInsert: {
        restaurantId: rid,
        version: 1,
        title: `${rid} menu`,
        createdAt: new Date(),
      },
      $push: { items: newItem },
    };

    // If Menu model exists, perform updates (transaction when possible; fallback otherwise)
    if (Menu) {
      let session = null;
      try {
        // Try to start a session (some drivers allow session even on standalone)
        session = await mongoose.startSession();
        logger &&
          logger.debug &&
          logger.debug("addMenuItem attempting transaction session", {
            restaurantId: rid,
          });

        try {
          session.startTransaction();

          // Use upsertUpdate + session
          const menuDoc = await Menu.findOneAndUpdate(
            { restaurantId: rid, isActive: true },
            upsertUpdate,
            { new: true, upsert: true, session }
          );

          if (!menuDoc)
            throw new Error("Failed to upsert or retrieve menu document");

          await Menu.updateOne(
            { _id: menuDoc._id, "categories.name": { $ne: categoryName } },
            {
              $push: { categories: { name: categoryName, itemIds: [itemId] } },
            },
            { session }
          );

          await Menu.updateOne(
            {
              _id: menuDoc._id,
              "categories.name": categoryName,
              "categories.itemIds": { $ne: itemId },
            },
            { $push: { "categories.$.itemIds": itemId } },
            { session }
          );

          await session.commitTransaction();
          session.endSession();
          logger &&
            logger.info &&
            logger.info("addMenuItem transaction committed", {
              restaurantId: rid,
              itemId,
            });
        } catch (txErr) {
          // Detect unsupported-transaction error and fall back to sequential updates
          const msg = txErr && txErr.message ? txErr.message : "";
          if (
            msg.includes("Transaction numbers are only allowed") ||
            msg.includes("transactions are not supported") ||
            msg.includes("not a replica set")
          ) {
            logger &&
              logger.warn &&
              logger.warn(
                "Transactions not supported by MongoDB server; falling back to non-transactional updates",
                { restaurantId: rid, error: msg }
              );

            // cleanup attempted transaction/session
            try {
              await session.abortTransaction();
            } catch (e) {
              /* ignore */
            }
            try {
              session.endSession();
            } catch (e) {
              /* ignore */
            }

            // Non-transactional fallback: sequential best-effort updates
            const menuDoc = await Menu.findOneAndUpdate(
              { restaurantId: rid, isActive: true },
              upsertUpdate,
              { new: true, upsert: true }
            );

            if (!menuDoc)
              throw new Error(
                "Failed to upsert or retrieve menu document (fallback)"
              );

            // Ensure category exists or push itemId into category
            await Menu.updateOne(
              { _id: menuDoc._id, "categories.name": { $ne: categoryName } },
              {
                $push: {
                  categories: { name: categoryName, itemIds: [itemId] },
                },
              }
            );
            await Menu.updateOne(
              {
                _id: menuDoc._id,
                "categories.name": categoryName,
                "categories.itemIds": { $ne: itemId },
              },
              { $push: { "categories.$.itemIds": itemId } }
            );

            logger &&
              logger.info &&
              logger.info("addMenuItem fallback sequential updates completed", {
                restaurantId: rid,
                itemId,
              });
          } else {
            // Some other transaction error - rethrow
            throw txErr;
          }
        }
      } catch (outerErr) {
        // If session couldn't be started at all (older drivers or other errors), fallback directly
        const msg = outerErr && outerErr.message ? outerErr.message : "";
        if (
          msg.includes("Transaction numbers are only allowed") ||
          msg.includes("transactions are not supported") ||
          msg.includes("not a replica set")
        ) {
          logger &&
            logger.warn &&
            logger.warn(
              "Transactions not supported by MongoDB server (startSession failed); using fallback sequential updates",
              { restaurantId: rid, error: msg }
            );

          // Non-transactional fallback
          const menuDoc = await Menu.findOneAndUpdate(
            { restaurantId: rid, isActive: true },
            upsertUpdate,
            { new: true, upsert: true }
          );

          if (!menuDoc)
            throw new Error(
              "Failed to upsert or retrieve menu document (fallback outer)"
            );

          await Menu.updateOne(
            { _id: menuDoc._id, "categories.name": { $ne: categoryName } },
            { $push: { categories: { name: categoryName, itemIds: [itemId] } } }
          );
          await Menu.updateOne(
            {
              _id: menuDoc._id,
              "categories.name": categoryName,
              "categories.itemIds": { $ne: itemId },
            },
            { $push: { "categories.$.itemIds": itemId } }
          );

          logger &&
            logger.info &&
            logger.info(
              "addMenuItem fallback sequential updates completed (outer)",
              {
                restaurantId: rid,
                itemId,
              }
            );
        } else {
          // Unexpected error - bubble up
          throw outerErr;
        }
      }
    } else {
      // Cannot add menu item without Menu collection
      logger &&
        logger.warn &&
        logger.warn("addMenuItem failed: Menu collection not available");
      return res
        .status(501)
        .json({ error: "Menu collection not available on server." });
    }

    // Ensure Admin exists minimally (do not store menu)
    logger &&
      logger.debug &&
      logger.debug("addMenuItem ensuring admin exists", { restaurantId: rid });
    await Admin.updateOne(
      { restaurantId: rid },
      {
        $setOnInsert: { restaurantId: rid, hashedPin: "" },
        $set: { updatedAt: Date.now() },
      },
      { upsert: true }
    );

    safePublish(`restaurant:${rid}:staff`, {
      event: "menuItemAdded",
      data: {
        itemId,
        name: newItem.name,
        category: categoryName,
        createdAt: new Date(),
      },
    });

    logger &&
      logger.info &&
      logger.info("addMenuItem completed successfully", {
        restaurantId: rid,
        itemId,
      });
    return res.status(201).json({
      item: {
        itemId: newItem.itemId,
        name: newItem.name,
        price: newItem.price,
        description: newItem.description,
        category: categoryName,
        image: newItem.image,
        isVegetarian: newItem.isVegetarian,
        preparationTime: newItem.preparationTime,
      },
    });
  } catch (err) {
    logger &&
      logger.error &&
      logger.error("Add menu item error:", err && err.stack ? err.stack : err);
    return next(err);
  }
}

/**
 * Update global config (taxPercent, globalDiscountPercent, serviceCharge)
 * PATCH /api/:rid/admin/config
 *
 * Stores values under admin.settings to keep a single config location.
 */
async function updateConfig(req, res, next) {
  logger &&
    logger.info &&
    logger.info("Enter updateConfig", { params: req.params });
  try {
    const { rid } = req.params;
    const { taxPercent, globalDiscountPercent, serviceCharge } = req.body || {};

    if (!rid) {
      logger && logger.warn && logger.warn("updateConfig missing rid");
      return res.status(400).json({ error: "Missing restaurant id (rid)" });
    }

    const settings = {};
    if (typeof taxPercent !== "undefined") {
      settings.taxPercent = Number(taxPercent);
    }
    if (typeof globalDiscountPercent !== "undefined") {
      settings.globalDiscountPercent = Number(globalDiscountPercent);
    }
    if (typeof serviceCharge !== "undefined") {
      settings.serviceCharge = Number(serviceCharge);
    }

    if (Object.keys(settings).length === 0) {
      logger &&
        logger.warn &&
        logger.warn("updateConfig no config fields provided");
      return res.status(400).json({ error: "No config fields provided" });
    }

    logger &&
      logger.debug &&
      logger.debug("updateConfig persisting settings", {
        restaurantId: rid,
        settings,
      });
    // Persist settings under admin.settings using updateOne (safe even if schema doesn't define it)
    const upd = {
      $setOnInsert: { restaurantId: rid, hashedPin: "" },
      $set: { updatedAt: Date.now(), settings },
    };
    await Admin.updateOne({ restaurantId: rid }, upd, { upsert: true });

    safePublish(`restaurant:${rid}:staff`, {
      event: "configUpdated",
      data: { settings },
    });

    const admin = await Admin.findOne({ restaurantId: rid }).lean();
    logger &&
      logger.info &&
      logger.info("updateConfig returning sanitized admin", {
        restaurantId: rid,
      });
    return res.json(sanitizeAdmin(admin));
  } catch (err) {
    logger &&
      logger.error &&
      logger.error("Update config error:", err && err.stack ? err.stack : err);
    return next(err);
  }
}

/**
 * Analytics (keeps your previous logic)
 * GET /api/:rid/admin/analytics?period=daily|weekly|monthly
 */
async function getAnalytics(req, res, next) {
  logger &&
    logger.info &&
    logger.info("Enter getAnalytics", { params: req.params, query: req.query });
  try {
    const { rid } = req.params;
    const period = (req.query.period || "daily").toLowerCase();

    if (!rid) {
      logger && logger.warn && logger.warn("getAnalytics missing rid");
      return res.status(400).json({ error: "Missing restaurant id (rid)" });
    }

    const now = new Date();
    let startDate;
    switch (period) {
      case "weekly":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "monthly":
        startDate = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          now.getDate()
        );
        break;
      case "daily":
      default:
        startDate = new Date(now.setHours(0, 0, 0, 0));
    }
    logger &&
      logger.debug &&
      logger.debug("getAnalytics computed startDate", { period, startDate });

    const billMatch = {
      $match: {
        restaurantId: rid,
        paymentStatus: "paid",
        createdAt: { $gte: startDate },
      },
    };
    logger &&
      logger.debug &&
      logger.debug("getAnalytics running Bill.aggregate", {
        restaurantId: rid,
      });
    const billAgg = await Bill.aggregate([
      billMatch,
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: { $ifNull: ["$totalAmount", 0] } },
          paidCount: { $sum: 1 },
        },
      },
    ]);
    const totalRevenue = (billAgg[0] && billAgg[0].totalRevenue) || 0;
    logger &&
      logger.debug &&
      logger.debug("getAnalytics billAgg result", { totalRevenue });

    const orderMatch = {
      $match: { restaurantId: rid, createdAt: { $gte: startDate } },
    };
    logger &&
      logger.debug &&
      logger.debug("getAnalytics running Order.aggregate for counts", {
        restaurantId: rid,
      });
    const orderCountAgg = await Order.aggregate([
      orderMatch,
      { $count: "count" },
    ]);
    const orderCount = (orderCountAgg[0] && orderCountAgg[0].count) || 0;
    logger &&
      logger.debug &&
      logger.debug("getAnalytics order count", { orderCount });

    logger &&
      logger.debug &&
      logger.debug("getAnalytics computing topItems", { restaurantId: rid });
    const topItemsAgg = await Order.aggregate([
      orderMatch,
      { $unwind: { path: "$items", preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: "$items.name",
          quantity: { $sum: { $ifNull: ["$items.quantity", 0] } },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: 5 },
      { $project: { name: "$_id", quantity: 1, _id: 0 } },
    ]);
    const topItems = topItemsAgg || [];
    logger &&
      logger.debug &&
      logger.debug("getAnalytics topItems", { topItems });

    logger &&
      logger.debug &&
      logger.debug("getAnalytics computing peakHours", { restaurantId: rid });
    const peakHoursAgg = await Order.aggregate([
      orderMatch,
      { $project: { hour: { $hour: "$createdAt" } } },
      { $group: { _id: "$hour", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 3 },
      { $project: { hour: "$_id", count: 1, _id: 0 } },
    ]);
    const peakHours = peakHoursAgg || [];
    logger &&
      logger.debug &&
      logger.debug("getAnalytics peakHours", { peakHours });

    const [unpaidBills, voidedBills] = await Promise.all([
      Bill.countDocuments({
        restaurantId: rid,
        paymentStatus: "unpaid",
        createdAt: { $gte: startDate },
      }),
      Bill.countDocuments({
        restaurantId: rid,
        status: "cancelled",
        createdAt: { $gte: startDate },
      }),
    ]);

    logger &&
      logger.info &&
      logger.info("getAnalytics completed", { restaurantId: rid });
    return res.json({
      period,
      totalRevenue,
      orderCount,
      topItems,
      peakHours,
      unpaidBills,
      voidedBills,
    });
  } catch (err) {
    logger &&
      logger.error &&
      logger.error("Get analytics error:", err && err.stack ? err.stack : err);
    return next(err);
  }
}

/**
 * Export report (keeps existing behavior)
 * POST /api/:rid/admin/export
 */
async function exportReport(req, res, next) {
  logger &&
    logger.info &&
    logger.info("Enter exportReport", { params: req.params, body: req.body });
  try {
    const { rid } = req.params;
    const { format, period } = req.body || {};

    if (!rid) {
      logger && logger.warn && logger.warn("exportReport missing rid");
      return res.status(400).json({ error: "Missing restaurant id (rid)" });
    }
    if (!["csv", "pdf"].includes(format)) {
      logger &&
        logger.warn &&
        logger.warn("exportReport invalid format", { format });
      return res.status(400).json({ error: "Invalid format" });
    }

    const reportId = crypto.randomBytes(16).toString("hex");
    const job = {
      reportId,
      format,
      period: period || "custom",
      status: "processing",
      createdAt: new Date(),
    };

    logger &&
      logger.info &&
      logger.info("exportReport publishing event", {
        restaurantId: rid,
        reportId,
        format,
        period,
      });
    safePublish(`restaurant:${rid}:staff`, {
      event: "reportRequested",
      data: { reportId, format, period },
    });

    logger &&
      logger.debug &&
      logger.debug("exportReport returning job metadata", { reportId });
    return res.json({
      ...job,
      downloadUrl: `/api/${rid}/admin/reports/${reportId}`,
    });
  } catch (err) {
    logger &&
      logger.error &&
      logger.error("Export report error:", err && err.stack ? err.stack : err);
    return next(err);
  }
}

/**
 * Update table (admin)
 * PATCH /api/:rid/admin/tables/:id
 */
async function updateTable(req, res, next) {
  logger &&
    logger.info &&
    logger.info("Enter updateTable", {
      params: req.params,
      bodyKeys: Object.keys(req.body || {}),
    });
  try {
    const { rid, id } = req.params;
    const { capacity, isActive } = req.body || {};

    if (!rid) {
      logger && logger.warn && logger.warn("updateTable missing rid");
      return res.status(400).json({ error: "Missing restaurant id (rid)" });
    }
    if (!id) {
      logger && logger.warn && logger.warn("updateTable missing id");
      return res.status(400).json({ error: "Missing table id" });
    }

    let Table;
    try {
      Table = require("../models/table.model");
      logger && logger.debug && logger.debug("updateTable loaded Table model");
    } catch (e) {
      Table = null;
      logger &&
        logger.debug &&
        logger.debug("updateTable Table model not available");
    }

    if (!Table) {
      logger &&
        logger.info &&
        logger.info(
          "updateTable Table model missing - returning simulated response",
          { tableId: id }
        );
      return res.json({
        tableId: id,
        capacity,
        isActive,
        updatedAt: new Date(),
      });
    }

    const update = {};
    if (typeof capacity !== "undefined") update.capacity = capacity;
    if (typeof isActive !== "undefined") update.isActive = isActive;
    if (isActive === false) {
      update.currentSessionId = null;
      update.staffAlias = null;
    }
    update.updatedAt = Date.now();

    logger &&
      logger.debug &&
      logger.debug("updateTable performing findOneAndUpdate", {
        tableId: id,
        restaurantId: rid,
        update,
      });
    const table = await Table.findOneAndUpdate(
      { _id: id, restaurantId: rid },
      update,
      { new: true }
    );
    if (!table) {
      logger &&
        logger.warn &&
        logger.warn("updateTable table not found or inactive", {
          tableId: id,
          restaurantId: rid,
        });
      return res.status(404).json({ error: "Table not found or inactive" });
    }

    safePublish(`restaurant:${rid}:staff`, {
      event: "tableStatusUpdated",
      data: { tableId: id, isActive },
    });

    logger &&
      logger.info &&
      logger.info("updateTable completed successfully", {
        tableId: id,
        restaurantId: rid,
      });
    return res.json(table);
  } catch (err) {
    logger &&
      logger.error &&
      logger.error("Update table error:", err && err.stack ? err.stack : err);
    return next(err);
  }
}

/**
 * Update admin PIN (admin only)
 * PATCH /api/:rid/admin/pin
 */
async function updatePin(req, res, next) {
  logger &&
    logger.info &&
    logger.info("Enter updatePin", { params: req.params });
  try {
    const { rid } = req.params;
    const { currentPin, newPin } = req.body || {};

    if (!rid) {
      logger && logger.warn && logger.warn("updatePin missing rid");
      return res.status(400).json({ error: "Missing restaurant id (rid)" });
    }
    if (!currentPin || !newPin) {
      logger &&
        logger.warn &&
        logger.warn("updatePin missing currentPin or newPin (redacted)");
      return res.status(400).json({ error: "Current and new PIN required" });
    }
    if (typeof newPin !== "string" || newPin.length < 4) {
      logger && logger.warn && logger.warn("updatePin invalid newPin length");
      return res
        .status(400)
        .json({ error: "New PIN must be at least 4 characters" });
    }

    logger &&
      logger.debug &&
      logger.debug("updatePin finding admin", { restaurantId: rid });
    const admin = await Admin.findOne({ restaurantId: rid });
    if (!admin) {
      logger &&
        logger.warn &&
        logger.warn("updatePin admin not found", { restaurantId: rid });
      return res.status(404).json({ error: "Admin configuration not found" });
    }

    logger &&
      logger.debug &&
      logger.debug("updatePin comparing current PIN (redacted)");
    const isMatch = await bcrypt.compare(currentPin, admin.hashedPin || "");
    if (!isMatch) {
      logger &&
        logger.warn &&
        logger.warn("updatePin invalid current PIN", { restaurantId: rid });
      return res.status(401).json({ error: "Invalid current PIN" });
    }

    const saltRounds = getBcryptRounds();
    logger &&
      logger.debug &&
      logger.debug("updatePin hashing new PIN", { saltRounds });
    const newHash = await bcrypt.hash(newPin, saltRounds);
    admin.hashedPin = newHash;
    admin.overrideTokens = [];
    await admin.save();

    safePublish(`restaurant:${rid}:staff`, {
      event: "adminPinUpdated",
      data: { updatedAt: new Date() },
    });

    logger &&
      logger.info &&
      logger.info("updatePin completed successfully", { restaurantId: rid });
    return res.json({ message: "PIN updated successfully" });
  } catch (err) {
    logger &&
      logger.error &&
      logger.error("Update PIN error:", err && err.stack ? err.stack : err);
    return next(err);
  }
}

/**
 * Update staff aliases (admin)
 * PATCH /api/:rid/admin/staff-aliases
 */
async function updateStaffAliases(req, res, next) {
  logger &&
    logger.info &&
    logger.info("Enter updateStaffAliases", {
      params: req.params,
      body: req.body,
    });
  try {
    const { rid } = req.params;
    const { staffAliases } = req.body || {};

    if (!rid) {
      logger && logger.warn && logger.warn("updateStaffAliases missing rid");
      return res.status(400).json({ error: "Missing restaurant id (rid)" });
    }
    if (!Array.isArray(staffAliases) || staffAliases.length === 0) {
      logger &&
        logger.warn &&
        logger.warn("updateStaffAliases invalid staffAliases");
      return res.status(400).json({ error: "Valid staff aliases required" });
    }

    logger &&
      logger.debug &&
      logger.debug("updateStaffAliases finding admin", { restaurantId: rid });
    let admin = await Admin.findOne({ restaurantId: rid });
    if (!admin) {
      logger &&
        logger.info &&
        logger.info(
          "updateStaffAliases admin not found, creating minimal admin doc",
          { restaurantId: rid }
        );
      admin = new Admin({ restaurantId: rid, staffAliases, hashedPin: "" });
    } else {
      logger &&
        logger.debug &&
        logger.debug(
          "updateStaffAliases setting staffAliases on existing admin",
          { restaurantId: rid }
        );
      admin.staffAliases = staffAliases;
    }

    await admin.save();

    safePublish(`restaurant:${rid}:staff`, {
      event: "staffAliasesUpdated",
      data: { staffAliases },
    });

    logger &&
      logger.info &&
      logger.info("updateStaffAliases completed", { restaurantId: rid });
    return res.json(sanitizeAdmin(admin));
  } catch (err) {
    logger &&
      logger.error &&
      logger.error(
        "Update staff aliases error:",
        err && err.stack ? err.stack : err
      );
    return next(err);
  }
}

/**
 * Reopen a finalized bill (admin override)
 * POST /api/:rid/admin/bills/:billId/reopen
 */
async function reopenBill(req, res, next) {
  logger &&
    logger.info &&
    logger.info("Enter reopenBill", {
      params: req.params,
      bodyKeys: Object.keys(req.body || {}),
    });
  try {
    const { rid, billId } = req.params;
    const { reason } = req.body || {};

    if (!rid || !billId) {
      logger &&
        logger.warn &&
        logger.warn("reopenBill missing params", { rid, billId });
      return res.status(400).json({ error: "Missing params" });
    }

    logger &&
      logger.debug &&
      logger.debug("reopenBill finding bill", { billId, restaurantId: rid });
    const bill = await Bill.findOne({ _id: billId, restaurantId: rid });
    if (!bill) {
      logger &&
        logger.warn &&
        logger.warn("reopenBill bill not found", { billId, restaurantId: rid });
      return res.status(404).json({ error: "Bill not found" });
    }

    if (bill.status !== "finalized") {
      logger &&
        logger.warn &&
        logger.warn("reopenBill bill not finalized", {
          billId,
          status: bill.status,
        });
      return res.status(400).json({ error: "Bill is not finalized" });
    }

    // record audit metadata
    bill.status = "draft";
    bill.adminReopened = {
      by: req.user ? req.user.restaurantId || "admin" : "admin",
      reason: reason || "admin reopen",
      at: new Date(),
    };
    await bill.save();

    safePublish(`restaurant:${rid}:staff`, {
      event: "billReopened",
      data: { billId },
    });

    logger &&
      logger.info &&
      logger.info("reopenBill completed successfully", {
        billId,
        restaurantId: rid,
      });
    return res.json({ success: true, data: bill });
  } catch (err) {
    logger &&
      logger.error &&
      logger.error("Reopen bill error:", err && err.stack ? err.stack : err);
    return next(err);
  }
}

module.exports = {
  login,
  staffLogin,
  generateOverrideToken,
  getMenu,
  updateMenu,
  getAnalytics,
  exportReport,
  updateTable,
  updatePin,
  updateStaffAliases,
  addMenuItem,
  updateConfig,
  reopenBill,
};
