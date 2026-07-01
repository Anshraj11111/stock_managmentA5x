import Shop from '../models/shopmodel.js';
import Payment from '../models/paymentmodel.js';
import SubscriptionHistory from '../models/subscriptionHistoryModel.js';
import AdminSettings from '../models/adminSettingsModel.js';

// ─────────────────────────────────────────────────────────────
// Subscription Plans (Updated June 2026)
// ─────────────────────────────────────────────────────────────
const PLANS = {
  trial: {
    duration: 30,   // days
    price: 0,
    label: 'Free Trial',
    description: '30 Days Free – No Credit Card Required',
    features: ['all']
  },
  starter: {
    monthly: { price: 199,  duration_months: 1  },
    yearly:  { price: 1999, duration_months: 12 },
    label: 'Starter',
    features: ['dashboard', 'products', 'billing', 'inventory', 'customers'],
    target: ['Kirana', 'General Store', 'Mobile Shop', 'Small Retail']
  },
  business: {
    monthly: { price: 399,  duration_months: 1  },
    yearly:  { price: 3999, duration_months: 12 },
    label: 'Business',
    popular: true,
    features: ['dashboard', 'products', 'billing', 'inventory', 'customers',
               'reports', 'profit_analytics', 'staff', 'purchase_tracking', 'advanced_inventory'],
    target: ['Hardware', 'Electrical', 'Medical', 'Wholesale Shops']
  },
  premium: {
    monthly: { price: 699,  duration_months: 1  },
    yearly:  { price: 6999, duration_months: 12 },
    label: 'Premium',
    features: ['all'],
    target: ['Multi Staff Shops', 'Large Stores', 'Distributors']
  },
  // 🚀 Launch Offer — lifetime locked for first 50 customers
  founder: {
    yearly: { price: 1499, duration_months: 12 },
    label: 'Founder Offer',
    limited_slots: 50,
    description: 'Lifetime locked price – price never increases for early adopters',
    features: ['all']
  }
};

// Get available plans
export const getPlans = async (req, res) => {
  try {
    res.json({
      success: true,
      plans: PLANS
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get current subscription
export const getCurrentSubscription = async (req, res) => {
  try {
    const shop = await Shop.findByPk(req.user.shop_id);
    
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    const now = new Date();
    let daysRemaining = 0;
    let featuresLocked = [];

    // Calculate days remaining
    if (shop.subscription_end_date) {
      const endDate = new Date(shop.subscription_end_date);
      daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    } else if (shop.trial_end_date) {
      const trialEnd = new Date(shop.trial_end_date);
      daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
    }

    // Determine locked features based on new plan structure
    if (shop.subscription_plan) {
      const plan = shop.subscription_plan;
      if (plan.startsWith('starter')) {
        // Starter: reports, staff, advanced analytics locked
        featuresLocked = ['reports', 'staff', 'profit_analytics', 'purchase_tracking', 'advanced_inventory', 'voice_commands', 'bulk_import', 'whatsapp'];
      } else if (plan.startsWith('business')) {
        // Business: voice, bulk import, whatsapp locked
        featuresLocked = ['voice_commands', 'bulk_import', 'whatsapp'];
      }
      // premium / founder — nothing locked
    }

    // Check deposit refund eligibility (2 months after deposit)
    let depositRefundEligible = false;
    if (shop.deposit_paid && !shop.deposit_refunded && shop.subscription_start_date) {
      const twoMonthsLater = new Date(shop.subscription_start_date);
      twoMonthsLater.setMonth(twoMonthsLater.getMonth() + 2);
      depositRefundEligible = now >= twoMonthsLater;
    }

    res.json({
      success: true,
      subscription: {
        plan_type: shop.subscription_plan || 'trial',
        plan_name: shop.subscription_plan,
        days_remaining: daysRemaining > 0 ? daysRemaining : 0,
        subscription_start_date: shop.subscription_start_date,
        subscription_end_date: shop.subscription_end_date,
        trial_end_date: shop.trial_end_date,
        features_locked: featuresLocked,
        deposit_paid: shop.deposit_paid,
        deposit_amount: shop.deposit_amount,
        deposit_refunded: shop.deposit_refunded,
        deposit_refund_eligible: depositRefundEligible,
        is_suspended: shop.isSuspended,
        suspension_reason: shop.suspension_reason
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Initiate payment
export const initiatePayment = async (req, res) => {
  try {
    const { plan_type, duration } = req.body;
    console.log('Initiate payment request:', { plan_type, duration, user: req.user });
    
    const shop = await Shop.findByPk(req.user.shop_id);

    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    let amount = 0;
    let planName = '';

    // Determine amount and plan name — new plan structure
    const billingCycle = req.body.billing_cycle || duration; // 'monthly' or 'yearly'

    if (plan_type === 'starter' || plan_type === 'business' || plan_type === 'premium' || plan_type === 'founder') {
      const planDef = PLANS[plan_type];
      if (!planDef) {
        return res.status(400).json({ error: 'Invalid plan type' });
      }

      const cycle = planDef[billingCycle];
      if (!cycle) {
        return res.status(400).json({ error: `Invalid billing cycle. Use 'monthly' or 'yearly'` });
      }

      amount   = cycle.price;
      planName = `${plan_type}_${billingCycle}`;
    } else {
      return res.status(400).json({ error: 'Invalid plan type. Use: starter, business, premium, founder' });
    }

    console.log('Creating payment record:', { shop_id: shop.id, payment_type: plan_type, plan_name: planName, amount });

    // Create payment record
    const payment = await Payment.create({
      shopId: shop.id,
      paymentType: 'subscription',
      planName: planName,
      amount: amount,
      verificationStatus: 'pending'
    });

    console.log('Payment record created:', payment.id);

    // Get UPI settings
    const upiIdSetting = await AdminSettings.findOne({
      where: { setting_key: 'subscription_upi_id' }
    });

    const qrCodeSetting = await AdminSettings.findOne({
      where: { setting_key: 'subscription_qr_code' }
    });

    console.log('UPI settings:', { 
      upi_id: upiIdSetting?.setting_value, 
      has_qr: !!qrCodeSetting?.setting_value 
    });

    res.json({
      success: true,
      payment_id: payment.id,
      amount: amount,
      plan_name: planName,
      upi_id: upiIdSetting?.setting_value || '8269858259@ybl',
      qr_code: qrCodeSetting?.setting_value || null
    });
  } catch (error) {
    console.error('Error in initiatePayment:', error);
    res.status(500).json({ error: error.message });
  }
};

// Submit payment proof
export const submitPaymentProof = async (req, res) => {
  try {
    const { payment_id, screenshot, transaction_id, upi_ref } = req.body;

    const payment = await Payment.findByPk(payment_id);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.shop_id !== req.user.shop_id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Update payment with proof
    await payment.update({
      paymentScreenshot: screenshot,
      transactionId: transaction_id,
      upiRefNumber: upi_ref,
      paymentDate: new Date(),
      verificationStatus: 'pending'
    });

    res.json({
      success: true,
      message: 'Payment submitted for verification'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Check feature access
export const checkFeatureAccess = async (req, res) => {
  try {
    const { feature } = req.params;
    const shop = await Shop.findByPk(req.user.shop_id);

    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    // Feature lock matrix per plan
    const starterLocked   = ['reports', 'staff', 'profit_analytics', 'purchase_tracking', 'advanced_inventory', 'voice_commands', 'bulk_import', 'whatsapp'];
    const businessLocked  = ['voice_commands', 'bulk_import', 'whatsapp'];
    // premium / founder — nothing locked

    let hasAccess = true;
    let reason = '';

    // Check if trial expired
    if (!shop.subscription_plan || shop.subscription_plan === 'trial') {
      const trialEnd = new Date(shop.trial_end_date);
      if (new Date() > trialEnd) {
        hasAccess = false;
        reason = 'Trial expired. Please subscribe to continue.';
      }
    }

    // Check if subscription expired
    if (shop.subscription_end_date) {
      const endDate = new Date(shop.subscription_end_date);
      if (new Date() > endDate) {
        hasAccess = false;
        reason = 'Subscription expired. Please renew.';
      }
    }

    // Check if suspended
    if (shop.isSuspended) {
      hasAccess = false;
      reason = shop.suspension_reason || 'Account suspended. Contact admin.';
    }

    // Feature lock checks
    if (hasAccess && shop.subscription_plan) {
      const plan = shop.subscription_plan;
      if (plan.startsWith('starter') && starterLocked.includes(feature)) {
        hasAccess = false;
        reason = `Upgrade to Business or Premium to access ${feature}`;
      } else if (plan.startsWith('business') && businessLocked.includes(feature)) {
        hasAccess = false;
        reason = `Upgrade to Premium to access ${feature}`;
      }
    }

    res.json({
      success: true,
      has_access: hasAccess,
      reason: reason
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
