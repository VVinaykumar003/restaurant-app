// app.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

// routes
const orderRoutes = require("./routes/order.route");
const tableRoutes = require("./routes/table.route");
const billRoutes = require("./routes/bill.route");
const callRoutes = require("./routes/call.route");
const adminRoutes = require("./routes/admin.route");

// middlewares (named)
const {
  validateRestaurant,
  validateCustomerSession,
  validateStaff,
  validateManager,
  handleIdempotency,
} = require("./common/middlewares/validate.middleware");

// logger
const logger = require("./common/libs/logger");

const app = express();

// ------------------ Sanity checks ------------------
if (!validateRestaurant || typeof validateRestaurant !== "function") {
  // panic early — app should not start without this
  throw new Error(
    "validateRestaurant middleware missing or invalid at ./common/middlewares/validate.middleware"
  );
}

// ------------------ Global Middlewares ------------------
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" })); // limit payload size
app.use(express.urlencoded({ extended: false }));

if (logger && logger.middleware) {
  app.use(logger.middleware);
}

// Basic health endpoint
app.get("/health", (req, res) => res.json({ status: "ok" }));

// ------------------ Mount per-restaurant validators ------------------
// ensures req.params.rid exists for routes under /api/:rid
app.use("/api/:rid", validateRestaurant);

// ------------------ API Routes ------------------
// route files apply their own route-level auth/validation as needed
app.use("/api/:rid/orders", orderRoutes);
app.use("/api/:rid/tables", tableRoutes);
app.use("/api/:rid/bills", billRoutes);
app.use("/api/:rid/calls", callRoutes);
// Mount admin routes under both /admin and base path
app.use("/api/:rid/admin", adminRoutes);
app.use("/api/:rid", adminRoutes);

// ------------------ 404 handler ------------------
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// ------------------ Error Handling ------------------
app.use((err, req, res, next) => {
  if (logger && typeof logger.error === "function") {
    logger.error(err && err.stack ? err.stack : err);
  } else {
    // fallback
    console.error(err);
  }
  const status = (err && err.status) || 500;
  res.status(status).json({ error: err.message || "Internal Server Error" });
});

module.exports = app;
