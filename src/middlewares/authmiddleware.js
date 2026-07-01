import jwt from "jsonwebtoken";
import Shop from "../models/shopmodel.js";

// ── Short-lived shop cache (30s TTL) to avoid repeated DB hits per request ──
const shopCache = new Map();
const SHOP_CACHE_TTL = 30 * 1000; // 30 seconds

export const getCachedShop = async (shopId) => {
  const cached = shopCache.get(shopId);
  if (cached && Date.now() - cached.ts < SHOP_CACHE_TTL) {
    return cached.shop;
  }
  const shop = await Shop.findByPk(shopId);
  if (shop) {
    shopCache.set(shopId, { shop, ts: Date.now() });
    // Keep cache size bounded
    if (shopCache.size > 200) {
      const first = shopCache.keys().next().value;
      shopCache.delete(first);
    }
  }
  return shop;
};

export const invalidateShopCache = (shopId) => {
  shopCache.delete(shopId);
};

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "No token provided" });

    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Invalid token format" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      user_id: decoded.user_id,
      role:    decoded.role,
      shop_id: decoded.shop_id,
    };

    if (decoded.shop_id) {
      // ✅ Use cached shop — avoids DB hit on every request
      const shop = await getCachedShop(decoded.shop_id);

      if (shop) {
        // Attach to req so shopMiddleware can reuse it
        req.shopData = shop;

        if (shop.isSuspended) {
          return res.status(403).json({
            message: "Your account has been suspended. Please contact support: +91-8269858259",
            suspended: true,
          });
        }

        const today = new Date();
        const trialEndDate = new Date(shop.trial_end_date);
        if (shop.plan_type === 'trial' && trialEndDate < today) {
          return res.status(403).json({
            message: "Trial expired. Please purchase subscription. Contact: +91-8269858259 for any queries.",
            trialExpired: true,
          });
        }
      }
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

export default authMiddleware;
