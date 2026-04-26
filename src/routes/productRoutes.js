import express from "express";
import authMiddleware from "../middlewares/authmiddleware.js";
import shopMiddleware from "../middlewares/shopmiddleware.js";
import { cacheMiddleware } from "../middlewares/cache.js";
import {
  addProduct,
  getProducts,
  getProductsForBilling,
  updateProduct,
  deleteProduct,
} from "../controllers/productcontroller.js";

const router = express.Router();

// 🔐 All product routes protected
router.use(authMiddleware);
router.use(shopMiddleware);

router.post("/", addProduct);
router.get("/", cacheMiddleware(10), getProducts); // Cache for 10 seconds
router.get("/billing", cacheMiddleware(30), getProductsForBilling); // Cache for 30 seconds, lightweight
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

export default router;
