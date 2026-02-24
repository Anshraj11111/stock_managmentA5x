import express from "express";
import authMiddleware from "../middlewares/authmiddleware.js";
import { cacheMiddleware } from "../middlewares/cache.js";
import {
  dailySalesReport,
  monthlySalesReport,
  dateRangeSalesReport,
} from "../controllers/reportcontroller.js";

const router = express.Router();

// 🔐 Protected reports
router.use(authMiddleware);

// 📊 Reports with caching
router.get("/daily", cacheMiddleware(30), dailySalesReport); // Cache for 30 seconds
router.get("/monthly", cacheMiddleware(60), monthlySalesReport); // Cache for 60 seconds
router.get("/date-range", cacheMiddleware(30), dateRangeSalesReport); // Cache for 30 seconds

export default router;
