import { getCachedShop } from "./authmiddleware.js";

const shopMiddleware = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const { shop_id, role } = req.user;

    if (!shop_id) {
      return res.status(403).json({ message: "Shop not linked to user" });
    }

    // ✅ Reuse shop already fetched by authMiddleware (no extra DB call)
    const shop = req.shopData || await getCachedShop(shop_id);

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const now = new Date();
    let trialExpired = false;

    if (shop.trial_end_date) {
      const trialDate = new Date(shop.trial_end_date);
      if (!isNaN(trialDate)) {
        trialExpired = trialDate < now;
      }
    }

    // Staff restriction
    if (role === "staff" && trialExpired && !shop.subscription_active) {
      return res.status(403).json({
        message: "Trial expired. Please contact shop owner.",
      });
    }

    req.shop = shop;
    next();
  } catch (error) {
    console.error("SHOP MIDDLEWARE ERROR:", error);
    return res.status(500).json({ message: "Shop access check failed" });
  }
};

export default shopMiddleware;
