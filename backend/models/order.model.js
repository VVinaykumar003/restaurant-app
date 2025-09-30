const mongoose = require("mongoose");
const { Schema } = mongoose;

const OrderItemSchema = new Schema({
  // Require MongoDB ObjectId for menu items
  menuItemId: { type: Schema.Types.ObjectId, required: true }, // Required ObjectId
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  // legacy price (client-provided) - keep but controllers will set priceAtOrder
  price: { type: Number, required: false, default: 0 },
  // authoritative snapshot at order creation
  priceAtOrder: { type: Number, required: true, default: 0 },
  notes: { type: String, default: "" },
  status: {
    type: String,
    enum: [
      "placed",
      "accepted",
      "preparing",
      "done",
      "cancelled",
      "pending",
      "approved",
      "ready",
      "served",
    ],
    default: "placed",
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const OrderSchema = new Schema({
  restaurantId: { type: String, required: true },
  tableId: { type: String, required: true },
  sessionId: { type: String, required: true },
  items: { type: [OrderItemSchema], default: [] },
  totalAmount: { type: Number, required: true, default: 0 },
  status: {
    type: String,
    enum: [
      "placed",
      "accepted",
      "preparing",
      "done",
      "cancelled",
      "pending",
      "approved",
      "ready",
      "served",
    ],
    default: "placed",
  },
  paymentStatus: {
    type: String,
    enum: ["unpaid", "paid"],
    default: "unpaid",
  },
  isCustomerOrder: { type: Boolean, default: true },
  customerName: { type: String, required: true },
  customerContact: { type: String },
  customerEmail: { type: String },

  staffAlias: { type: String, default: null },
  overrideToken: { type: String, default: null },
  // optimistic locking
  version: { type: Number, default: 1 },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Indexes
OrderSchema.index({ restaurantId: 1, tableId: 1, status: 1 });
OrderSchema.index({ sessionId: 1 });

// Middleware to update timestamps
OrderSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Order", OrderSchema);
