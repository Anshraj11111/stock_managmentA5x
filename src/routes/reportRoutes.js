import express from "express";
import authMiddleware from "../middlewares/authmiddleware.js";
import {
  dailySalesReport,
  monthlySalesReport,
} from "../controllers/reportcontroller.js";

const router = express.Router();

// 🔐 Protected reports
router.use(authMiddleware);

// 📊 Reports
router.get("/daily", dailySalesReport);
router.get("/monthly", monthlySalesReport);

export default router;
