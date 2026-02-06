import express from "express";
import authMiddleware from "../middlewares/authmiddleware.js";
import shopMiddleware from "../middlewares/shopmiddleware.js"
import {
  addProduct,
  getProducts,
  updateProduct,
  deleteProduct,
} from "../controllers/productcontroller.js";

const router = express.Router();

// 🔐 All product routes protected
router.use(authMiddleware);
router.use(shopMiddleware);

router.post("/", addProduct);
router.get("/", getProducts);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

export default router;
