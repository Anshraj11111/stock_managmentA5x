import Shop from "../models/shopmodel.js";

const shopMiddleware = async (req, res, next) => {
  try {
    // JWT se aaya hua data
    const { shop_id, role } = req.user;

    if (!shop_id) {
      return res.status(403).json({
        message: "Shop not linked to user",
      });
    }

    // Shop fetch karo
    const shop = await Shop.findByPk(shop_id);

    if (!shop) {
      return res.status(404).json({
        message: "Shop not found",
      });
    }

    const now = new Date();

    const trialExpired =
      shop.trial_end_date && new Date(shop.trial_end_date) < now;

    // 🔐 STAFF RULES
    if (role === "staff") {
      if (trialExpired && !shop.subscription_active) {
        return res.status(403).json({
          message: "Trial expired. Please contact shop owner.",
        });
      }
    }

    // 🔐 OWNER RULES
    if (role === "owner") {
      // Owner ko sirf warning dena future me (abhi allow)
      // Billing, renewal APIs yahin se handle honge
    }

    // shop ko request me attach kar do (useful later)
    req.shop = shop;

    next(); // 🚀 allow request
  } catch (error) {
    return res.status(500).json({
      message: "Shop access check failed",
    });
  }
};

export default shopMiddleware;
