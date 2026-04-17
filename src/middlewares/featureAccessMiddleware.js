import Shop from '../models/shopmodel.js';

export const checkFeatureAccess = (feature) => {
  return async (req, res, next) => {
    try {
      const shop = await Shop.findByPk(req.user.shop_id);

      if (!shop) {
        return res.status(404).json({ error: 'Shop not found' });
      }

      // Trial and Premium have all features
      if (shop.subscription_plan === 'trial' || !shop.subscription_plan) {
        return next();
      }

      if (shop.subscription_plan && shop.subscription_plan.startsWith('premium')) {
        return next();
      }

      // Basic plan - check locked features
      const lockedFeatures = ['reports', 'staff', 'customers'];

      if (shop.subscription_plan && shop.subscription_plan.startsWith('basic')) {
        if (lockedFeatures.includes(feature)) {
          return res.status(403).json({
            error: 'Feature locked',
            message: `Upgrade to Premium to access ${feature}`,
            required_plan: 'premium',
            upgrade_url: '/subscription'
          });
        }
      }

      next();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
};
