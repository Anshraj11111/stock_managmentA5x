import Shop from '../models/shopmodel.js';

export const checkSubscription = async (req, res, next) => {
  try {
    const shop = await Shop.findByPk(req.user.shop_id);

    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    // Check if suspended
    if (shop.isSuspended) {
      return res.status(403).json({
        error: 'Account suspended',
        message: shop.suspension_reason || 'Contact admin',
        action_required: 'contact_admin'
      });
    }

    // Check if trial expired
    if (shop.subscription_plan === 'trial' || !shop.subscription_plan) {
      if (shop.trial_end_date) {
        const trialEnd = new Date(shop.trial_end_date);
        if (new Date() > trialEnd && !shop.deposit_paid) {
          return res.status(403).json({
            error: 'Trial expired',
            message: 'Please pay ₹100 deposit to continue',
            action_required: 'payment',
            payment_type: 'deposit'
          });
        }
      }
    }

    // Check if subscription expired
    if (shop.subscription_end_date) {
      const endDate = new Date(shop.subscription_end_date);
      if (new Date() > endDate) {
        return res.status(403).json({
          error: 'Subscription expired',
          message: 'Please renew your subscription',
          action_required: 'renewal'
        });
      }
    }

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
