import { getCachedShop } from './authmiddleware.js';

// ─────────────────────────────────────────────────────────────
// Feature Lock Matrix — New Plan Structure (June 2026)
// ─────────────────────────────────────────────────────────────
//
// trial     → all features unlocked (30-day free trial)
// starter   → dashboard, products, billing, inventory, customers
// business  → starter + reports, staff, analytics, purchase tracking
// premium   → everything unlocked
// founder   → everything unlocked (lifetime locked price)
// ─────────────────────────────────────────────────────────────

const STARTER_LOCKED  = ['reports', 'staff', 'profit_analytics', 'purchase_tracking', 'advanced_inventory', 'voice_commands', 'bulk_import', 'whatsapp'];
const BUSINESS_LOCKED = ['voice_commands', 'bulk_import', 'whatsapp'];

export const checkFeatureAccess = (feature) => {
  return async (req, res, next) => {
    try {
      const shop = req.shopData || req.shop || await getCachedShop(req.user.shop_id);

      if (!shop) {
        return res.status(404).json({ error: 'Shop not found' });
      }

      // Suspended
      if (shop.isSuspended) {
        return res.status(403).json({
          error: 'Account suspended',
          message: shop.suspension_reason || 'Contact admin.',
        });
      }

      // Trial — all features open
      if (!shop.subscription_plan || shop.subscription_plan === 'trial') {
        return next();
      }

      const plan = shop.subscription_plan;

      // premium / founder — nothing locked
      if (plan.startsWith('premium') || plan.startsWith('founder')) {
        return next();
      }

      // business — voice/bulk/whatsapp locked
      if (plan.startsWith('business')) {
        if (BUSINESS_LOCKED.includes(feature)) {
          return res.status(403).json({
            error: 'Feature locked',
            message: `Upgrade to Premium to access ${feature}`,
            required_plan: 'premium',
            upgrade_url: '/subscription'
          });
        }
        return next();
      }

      // starter — reports, staff, analytics etc. locked
      if (plan.startsWith('starter')) {
        if (STARTER_LOCKED.includes(feature)) {
          return res.status(403).json({
            error: 'Feature locked',
            message: `Upgrade to Business or Premium to access ${feature}`,
            required_plan: 'business',
            upgrade_url: '/subscription'
          });
        }
        return next();
      }

      // Unknown plan — allow (safe default)
      next();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
};
