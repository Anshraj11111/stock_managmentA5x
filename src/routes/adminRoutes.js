import express from "express";
import rateLimit from "express-rate-limit";
import {
  adminSignup,
  adminLogin,
  getDashboardStats,
  getUsers,
  getUserById,
  activateUser,
  deactivateUser,
  softDeleteUser,
  getShops,
  suspendShop,
  extendTrial,
  updateSubscription,
  getAnalytics,
  getShopProducts
} from "../controllers/admincontroller.js";
import { adminAuthMiddleware } from "../middlewares/adminauthmiddleware.js";

const router = express.Router();

// Rate limiter for admin authentication (5 attempts per 15 minutes)
const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: {
    success: false,
    message: "Too many login attempts, please try again later"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ======================================
// PUBLIC ROUTES (No authentication)
// ======================================

// Admin authentication
router.post("/admin/signup", adminAuthLimiter, adminSignup);
router.post("/admin/login", adminAuthLimiter, adminLogin);

// ======================================
// PROTECTED ROUTES (Require admin authentication)
// ======================================

// Dashboard
router.get("/admin/dashboard/stats", adminAuthMiddleware, getDashboardStats);

// User Management
router.get("/admin/users", adminAuthMiddleware, getUsers);
router.get("/admin/users/:id", adminAuthMiddleware, getUserById);
router.put("/admin/users/:id/activate", adminAuthMiddleware, activateUser);
router.put("/admin/users/:id/deactivate", adminAuthMiddleware, deactivateUser);
router.delete("/admin/users/:id", adminAuthMiddleware, softDeleteUser);

// Shop Management
router.get("/admin/shops", adminAuthMiddleware, getShops);
router.get("/admin/shops/:id/products", adminAuthMiddleware, getShopProducts);
router.put("/admin/shops/:id/suspend", adminAuthMiddleware, suspendShop);
router.put("/admin/shops/:id/extend-trial", adminAuthMiddleware, extendTrial);
router.put("/admin/shops/:id/subscription", adminAuthMiddleware, updateSubscription);

// Analytics
router.get("/admin/analytics", adminAuthMiddleware, getAnalytics);

export default router;
