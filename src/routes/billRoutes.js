import express from "express";
import authMiddleware from "../middlewares/authmiddleware.js";
import shopMiddleware from "../middlewares/shopmiddleware.js";
import { cacheMiddleware } from "../middlewares/cache.js";
import { previewBill, createBill, payDue, getRecentBills,
  getBillStats, getBillById } from "../controllers/billcontroller.js";

const router = express.Router();

router.use(authMiddleware);
router.use(shopMiddleware);

router.post("/", createBill);
router.post("/preview", previewBill); // No cache for preview (POST request)
router.post("/:id/pay", payDue);
router.get("/recent", cacheMiddleware(30), getRecentBills);   // 30s
router.get("/stats",  cacheMiddleware(30), getBillStats);      // 30s
router.get("/:id",    cacheMiddleware(30), getBillById);       // 30s

export default router;
