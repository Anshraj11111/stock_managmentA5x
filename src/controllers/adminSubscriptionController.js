import Shop from '../models/shopmodel.js';
import Payment from '../models/paymentmodel.js';
import SubscriptionHistory from '../models/subscriptionHistoryModel.js';
import AdminSettings from '../models/adminSettingsModel.js';
import User from '../models/usermodel.js';
import { Op } from 'sequelize';
import QRCode from 'qrcode';

// Get all subscriptions
export const getAllSubscriptions = async (req, res) => {
  try {
    const { status, plan_type } = req.query;

    const whereClause = {};
    if (plan_type) {
      whereClause.subscription_plan = { [Op.like]: `${plan_type}%` };
    }
    if (status === 'active') {
      whereClause.subscription_active = true;
    }

    const shops = await Shop.findAll({
      where: whereClause,
      order: [['subscription_end_date', 'ASC']]
    });

    const subscriptions = await Promise.all(shops.map(async (shop) => {
      const now = new Date();
      let daysRemaining = 0;

      if (shop.subscription_end_date) {
        const endDate = new Date(shop.subscription_end_date);
        daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
      }

      // Get owner email
      const owner = await User.findOne({ where: { shop_id: shop.id } });

      return {
        shop_id: shop.id,
        shop_name: shop.shop_name,
        owner_email: owner?.email || 'N/A',
        plan_type: shop.subscription_plan,
        start_date: shop.subscription_start_date,
        end_date: shop.subscription_end_date,
        days_remaining: daysRemaining > 0 ? daysRemaining : 0,
        deposit_paid: shop.deposit_paid,
        deposit_refunded: shop.deposit_refunded,
        is_suspended: shop.isSuspended,
        status: daysRemaining > 0 ? 'active' : 'expired'
      };
    }));

    res.json({
      success: true,
      subscriptions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get pending payments
export const getPendingPayments = async (req, res) => {
  try {
    const payments = await Payment.findAll({
      where: { verificationStatus: 'pending' },
      order: [['created_at', 'DESC']]
    });

    const formattedPayments = await Promise.all(payments.map(async (payment) => {
      const shop = await Shop.findByPk(payment.shopId);
      
      return {
        payment_id: payment.id,
        shop_id: payment.shopId,
        shop_name: shop?.shop_name || 'Unknown',
        payment_type: payment.paymentType,
        plan_name: payment.planName,
        amount: payment.amount,
        screenshot: payment.paymentScreenshot,
        transaction_id: payment.transactionId,
        upi_ref: payment.upiRefNumber,
        submitted_at: payment.created_at
      };
    }));

    res.json({
      success: true,
      payments: formattedPayments
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Verify payment
export const verifyPayment = async (req, res) => {
  try {
    const { payment_id, status, notes } = req.body;

    const payment = await Payment.findByPk(payment_id);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Update payment status
    await payment.update({
      verificationStatus: status,
      verifiedBy: req.admin.admin_id,
      verifiedAt: new Date(),
      notes: notes
    });

    let subscriptionActivated = false;

    // If approved, activate subscription
    if (status === 'approved') {
      const shop = await Shop.findByPk(payment.shopId);

      if (payment.paymentType === 'deposit') {
        // Activate after deposit
        await shop.update({
          deposit_paid: true,
          deposit_amount: payment.amount
        });
      } else if (payment.paymentType === 'subscription') {
        // Activate subscription
        const planName = payment.planName;
        const [planType, duration] = planName.split('_');
        const months = parseInt(duration);

        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + months);

        await shop.update({
          subscription_plan: planName,
          subscription_start_date: startDate,
          subscription_end_date: endDate,
          subscription_active: true,
          plan_type: planType
        });

        // Create subscription history
        await SubscriptionHistory.create({
          shopId: shop.id,
          planType: planType,
          planDuration: `${months}m`,
          startDate: startDate,
          endDate: endDate,
          amountPaid: payment.amount,
          paymentId: payment.id,
          status: 'active'
        });

        subscriptionActivated = true;
      }
    }

    res.json({
      success: true,
      message: `Payment ${status}`,
      subscription_activated: subscriptionActivated
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Suspend shop
export const suspendShop = async (req, res) => {
  try {
    const { shop_id, reason } = req.body;

    const shop = await Shop.findByPk(shop_id);

    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    await shop.update({
      isSuspended: true,
      suspension_reason: reason
    });

    res.json({
      success: true,
      message: 'Shop suspended successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Activate shop
export const activateShop = async (req, res) => {
  try {
    const { shop_id } = req.body;

    const shop = await Shop.findByPk(shop_id);

    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    await shop.update({
      isSuspended: false,
      suspension_reason: null
    });

    res.json({
      success: true,
      message: 'Shop activated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Process refund
export const processRefund = async (req, res) => {
  try {
    const { shop_id, amount, notes } = req.body;

    const shop = await Shop.findByPk(shop_id);

    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    await shop.update({
      deposit_refunded: true,
      deposit_refund_date: new Date()
    });

    // Create refund payment record
    await Payment.create({
      shopId: shop_id,
      paymentType: 'refund',
      amount: amount,
      verificationStatus: 'approved',
      verifiedBy: req.admin.admin_id,
      verifiedAt: new Date(),
      notes: notes
    });

    res.json({
      success: true,
      message: 'Refund processed successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update admin settings
export const updateAdminSettings = async (req, res) => {
  try {
    const { upi_id } = req.body;

    if (!upi_id) {
      return res.status(400).json({ error: 'UPI ID is required' });
    }

    // Generate QR code from UPI ID
    const upiString = `upi://pay?pa=${upi_id}&pn=Subscription&cu=INR`;
    const qrCodeDataUrl = await QRCode.toDataURL(upiString, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Update or insert UPI ID
    await AdminSettings.upsert({
      setting_key: 'subscription_upi_id',
      setting_value: upi_id
    });

    // Update or insert QR code
    await AdminSettings.upsert({
      setting_key: 'subscription_qr_code',
      setting_value: qrCodeDataUrl
    });

    res.json({
      success: true,
      message: 'Settings updated successfully',
      qr_code: qrCodeDataUrl
    });
  } catch (error) {
    console.error('Error updating admin settings:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get admin settings
export const getAdminSettings = async (req, res) => {
  try {
    const upiId = await AdminSettings.findOne({
      where: { setting_key: 'subscription_upi_id' }
    });

    const qrCode = await AdminSettings.findOne({
      where: { setting_key: 'subscription_qr_code' }
    });

    res.json({
      success: true,
      settings: {
        upi_id: upiId?.setting_value || '',
        qr_code: qrCode?.setting_value || null
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
