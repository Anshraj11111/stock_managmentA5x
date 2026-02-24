import jwt from "jsonwebtoken";
import Shop from "../models/shopmodel.js";

const authMiddleware = async (req, res, next) => {
  try {
    // Header se token uthao
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }

    // Format: Bearer TOKEN
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Invalid token format" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // req.user me attach
    req.user = {
      user_id: decoded.user_id,
      role: decoded.role,
      shop_id: decoded.shop_id,
    };

    // ✅ Check trial expiry for every request
    if (decoded.shop_id) {
      const shop = await Shop.findByPk(decoded.shop_id);
      
      if (shop) {
        // Check if shop is suspended
        if (shop.isSuspended) {
          return res.status(403).json({ 
            message: "Your account has been suspended. Please contact support: +91-9876543210",
            suspended: true
          });
        }

        const today = new Date();
        const trialEndDate = new Date(shop.trial_end_date);
        
        // If plan is trial and trial has expired
        if (shop.plan_type === 'trial' && trialEndDate < today) {
          return res.status(403).json({ 
            message: "Trial expired. Please purchase subscription. Contact: +91-9876543210 for any queries.",
            trialExpired: true
          });
        }
      }
    }

    next(); // 🚀 allow request
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

export default authMiddleware;