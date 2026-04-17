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

// All routes require authentication
router.use(authMiddleware);

// Get available plans
router.get('/plans', getPlans);

// Get current subscription
router.get('/current', getCurrentSubscription);

// Initiate payment
router.post('/initiate-payment', initiatePayment);

// Submit payment proof
router.post('/submit-payment', submitPaymentProof);

// Check feature access
router.get('/feature-access/:feature', checkFeatureAccess);

export default router;
