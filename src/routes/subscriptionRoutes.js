import express from 'express';
import {
  getPlans,
  getCurrentSubscription,
  initiatePayment,
  submitPaymentProof,
  checkFeatureAccess
} from '../controllers/subscriptionController.js';
import authMiddleware from '../middlewares/authmiddleware.js';

const router = express.Router();

// Get available plans - NO authentication required (public)
router.get('/plans', getPlans);

// All other routes require authentication
router.use(authMiddleware);

// Get current subscription
router.get('/current', getCurrentSubscription);

// Initiate payment
router.post('/initiate-payment', initiatePayment);

// Submit payment proof
router.post('/submit-payment', submitPaymentProof);

// Check feature access
router.get('/feature-access/:feature', checkFeatureAccess);

export default router;
