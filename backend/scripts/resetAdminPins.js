const Admin = require("../models/admin.model");
const { connectDB } = require("../db/mongoose");
const bcrypt = require("bcrypt");
const config = require("../config");

async function resetPins() {
  try {
    await connectDB();

    // Get restaurant ID from environment or prompt
    const restaurantId = process.env.RESTAURANT_ID || "restro10";

    // Find the admin record
    const admin = await Admin.findOne({ restaurantId });
    if (!admin) {
      console.log("Admin record not found");
      process.exit(1);
    }

    // Hash the new PIN
    const saltRounds = parseInt(config.BCRYPT_ROUNDS || "10", 10) || 10;
    const hashedPin = await bcrypt.hash("1111", saltRounds);

    // Update both PINs
    admin.hashedPin = hashedPin;
    admin.staffHashedPin = hashedPin;

    await admin.save();

    console.log(`PINs reset successfully for restaurant: ${restaurantId}`);
    process.exit(0);
  } catch (err) {
    console.error("Error resetting PINs:", err);
    process.exit(1);
  }
}

resetPins();
