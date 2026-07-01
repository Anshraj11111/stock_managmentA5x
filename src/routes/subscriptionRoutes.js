import express from 'express';
import {
  getPlans,
  getCurrentSubscription,
  initiatePayment,
  submitPaymentProof,
  checkFeatureAccess
} from '../controllers/subscriptionController.js';
import authMiddleware from '../middlewares/authmiddleware.js';
import { cacheMiddleware } from '../middlewares/cache.js';

const router = express.Router();

// Plans — public, cache 5 min (plans change rarely)
router.get('/plans', cacheMiddleware(300), getPlans);

router.use(authMiddleware);

// Current subscription — cache 60s (changes only on admin action)
router.get('/current', cacheMiddleware(60), getCurrentSubscription);

router.post('/initiate-payment', initiatePayment);
router.post('/submit-payment', submitPaymentProof);

// Feature access — cache 30s per user
router.get('/feature-access/:feature', cacheMiddleware(30), checkFeatureAccess);

export default router;
