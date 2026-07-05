import express from "express";
import authMiddleware from "../middlewares/authmiddleware.js";
import shopMiddleware from "../middlewares/shopmiddleware.js";
import { cacheMiddleware } from "../middlewares/cache.js";
import {
  previewBill, createBill, payDue,
  getRecentBills, getBillStats, getBillById,
  getBillWithDetails, editBill,
} from "../controllers/billcontroller.js";

const router = express.Router();

router.use(authMiddleware);
router.use(shopMiddleware);

router.post("/",             createBill);
router.post("/preview",      previewBill);
router.post("/:id/pay",      payDue);
router.put("/:id",           editBill);                            // Edit bill
router.get("/recent",        cacheMiddleware(30), getRecentBills);
router.get("/stats",         cacheMiddleware(30), getBillStats);
router.get("/:id/detail",    cacheMiddleware(10), getBillWithDetails); // View full details
router.get("/:id",           cacheMiddleware(30), getBillById);

export default router;
