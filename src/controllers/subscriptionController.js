import Shop from '../models/shopmodel.js';
import Payment from '../models/paymentmodel.js';
import SubscriptionHistory from '../models/subscriptionHistoryModel.js';
import AdminSettings from '../models/adminSettingsModel.js';

// Subscription plans configuration
const PLANS = {
  trial: { duration: 31, price: 0, features: ['all'] },
  deposit: { price: 100 },
  basic: [
    { duration: 7, months: 7, price: 7999, features: ['dashboard', 'products', 'billing'] },
    { duration: 9, months: 9, price: 6899, features: ['dashboard', 'products', 'billing'] },
    { duration: 12, months: 12, price: 9999, features: ['dashboard', 'products', 'billing'] }
  ],
  premium: [
    { duration: 7, months: 7, price: 9499, features: ['all'] },
    { duration: 9, months: 9, price: 8399, features: ['all'] },
    { duration: 12, months: 12, price: 11499, features: ['all'] }
  ]
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

    // Determine locked features
    if (shop.subscription_plan && shop.subscription_plan.startsWith('basic')) {
      featuresLocked = ['reports', 'staff', 'customers'];
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

    // Determine amount and plan name
    if (plan_type === 'deposit') {
      amount = 100;
      planName = 'deposit';
    } else if (plan_type === 'basic' || plan_type === 'premium') {
      const planList = PLANS[plan_type];
      const selectedPlan = planList.find(p => p.duration === parseInt(duration));
      
      if (!selectedPlan) {
        return res.status(400).json({ error: 'Invalid plan selected' });
      }

      amount = selectedPlan.price;
      planName = `${plan_type}_${duration}m`;
    } else {
      return res.status(400).json({ error: 'Invalid plan type' });
    }

    console.log('Creating payment record:', { shop_id: shop.id, payment_type: plan_type, plan_name: planName, amount });

    // Create payment record
    const payment = await Payment.create({
      shopId: shop.id,
      paymentType: plan_type === 'deposit' ? 'deposit' : 'subscription',
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

    const lockedFeatures = ['reports', 'staff', 'customers'];
    let hasAccess = true;
    let reason = '';

    // Check if trial expired
    if (shop.subscription_plan === 'trial' || !shop.subscription_plan) {
      const trialEnd = new Date(shop.trial_end_date);
      if (new Date() > trialEnd && !shop.deposit_paid) {
        hasAccess = false;
        reason = 'Trial expired. Please pay ₹100 deposit to continue.';
      }
    }

    // Check if subscription expired
    if (shop.subscription_end_date) {
      const endDate = new Date(shop.subscription_end_date);
      if (new Date() > endDate) {
        hasAccess = false;
        reason = 'Subscription expired. Please renew your subscription.';
      }
    }

    // Check if suspended
    if (shop.isSuspended) {
      hasAccess = false;
      reason = shop.suspension_reason || 'Account suspended. Contact admin.';
    }

    // Check feature lock for basic plan
    if (shop.subscription_plan && shop.subscription_plan.startsWith('basic')) {
      if (lockedFeatures.includes(feature)) {
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
