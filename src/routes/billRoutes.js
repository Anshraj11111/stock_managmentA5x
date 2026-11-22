import express from "express";
import authMiddleware from "../middlewares/authmiddleware.js";
import shopMiddleware from "../middlewares/shopmiddleware.js";
import { cacheMiddleware } from "../middlewares/cache.js";
import {
  previewBill, createBill, payDue,
  getRecentBills, getBillStats, getBillById,
  getBillWithDetails, editBill, deleteBill,
} from "../controllers/billcontroller.js";

const router = express.Router();

router.use(authMiddleware);
router.use(shopMiddleware);

// ✅ Enhanced route optimizations with better caching
router.post("/",             createBill);
router.post("/preview",      previewBill);
router.post("/:id/pay",      payDue);
router.put("/:id",           editBill);                            
router.delete("/:id",        deleteBill);                         
router.get("/recent",        cacheMiddleware(60), getRecentBills);  // ✅ 1 minute cache
router.get("/stats",         cacheMiddleware(120), getBillStats);   // ✅ 2 minute cache  
router.get("/:id/detail",    cacheMiddleware(30), getBillWithDetails); 
router.get("/:id",           cacheMiddleware(60), getBillById);     // ✅ 1 minute cache

export default router;
