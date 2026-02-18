import Shop from "../models/shopmodel.js";

const checkAccess = async (req, res, next) => {
  const shop = await Shop.findByPk(req.user.shop_id);

  const now = new Date();

  // 💎 If Paid Subscription Active
  if (shop.subscription_active && shop.plan_expiry_date > now) {
    return next();
  }

  // 🆓 If Trial Still Active
  if (shop.plan_type === "trial" && shop.trial_end_date > now) {
    return next();
  }

  return res.status(403).json({
    message: "Your trial or subscription has expired",
  });
};

export default checkAccess;
