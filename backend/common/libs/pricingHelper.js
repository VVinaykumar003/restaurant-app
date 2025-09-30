/**
 * Fetches pricing configuration (taxes, serviceCharge, globalDiscountPercent)
 * from Menu or Admin settings fallback.
 *
 * @param {string} rid Restaurant ID
 * @returns {Promise<Object>} Pricing configuration
 */
async function getPricingConfig(rid) {
  const Menu = require("../../models/menu.model");
  const Admin = require("../../models/admin.model");

  try {
    // Try to get active menu first
    const menuDoc = await Menu.findOne({
      restaurantId: rid,
      isActive: true,
    }).lean();

    if (menuDoc) {
      return {
        taxes: menuDoc.taxes || [],
        serviceCharge: menuDoc.serviceCharge || 0,
        globalDiscountPercent: 0, // Menu doesn't support global discount
      };
    }
  } catch (e) {
    console.warn("Menu lookup failed, falling back to Admin settings");
  }

  // Fallback to Admin settings
  try {
    const adminDoc = await Admin.findOne({ restaurantId: rid }).lean();

    if (adminDoc?.settings) {
      return {
        taxes: [
          {
            name: "Tax",
            percent: adminDoc.settings.taxPercent || 0,
          },
        ],
        serviceCharge: adminDoc.settings.serviceCharge || 0,
        globalDiscountPercent: adminDoc.settings.globalDiscountPercent || 0,
      };
    }
  } catch (e) {
    console.error("Admin settings lookup failed:", e);
  }

  // Default fallback
  return {
    taxes: [],
    serviceCharge: 0,
    globalDiscountPercent: 0,
  };
}

module.exports = {
  getPricingConfig,
};
