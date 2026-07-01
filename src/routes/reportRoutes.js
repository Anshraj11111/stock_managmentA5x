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

// 📊 Reports with better caching (reports don't change frequently)
router.get("/daily",      cacheMiddleware(120), dailySalesReport);      // 2 min
router.get("/monthly",    cacheMiddleware(300), monthlySalesReport);     // 5 min
router.get("/date-range", cacheMiddleware(120), dateRangeSalesReport);   // 2 min

export default router;
