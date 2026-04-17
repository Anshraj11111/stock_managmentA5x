import express from 'express';
import {
  getAllSubscriptions,
  getPendingPayments,
  verifyPayment,
  suspendShop,
  activateShop,
  processRefund,
  updateAdminSettings,
  getAdminSettings
} from '../controllers/adminSubscriptionController.js';
import { adminAuthMiddleware } from '../middlewares/adminauthmiddleware.js';

const router = express.Router();

// All routes require admin authentication
router.use(adminAuthMiddleware);

// Get all subscriptions
router.get('/subscriptions', getAllSubscriptions);

// Get pending payments
router.get('/payments/pending', getPendingPayments);

// Verify payment
router.post('/payments/verify', verifyPayment);

// Suspend shop
router.post('/shops/suspend', suspendShop);

// Activate shop
router.post('/shops/activate', activateShop);

// Process refund
router.post('/refunds/process', processRefund);

// Get admin settings
router.get('/settings/subscription', getAdminSettings);

// Update admin settings
router.post('/settings/subscription', updateAdminSettings);

export default router;
