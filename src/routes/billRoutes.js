import express from "express";
import authMiddleware from "../middlewares/authmiddleware.js";
import shopMiddleware from "../middlewares/shopmiddleware.js";
import { previewBill,createBill, payDue } from "../controllers/billcontroller.js";

const router = express.Router();

router.use(authMiddleware);
router.use(shopMiddleware);

router.post("/", createBill);
router.post("/preview", previewBill);
router.post("/:id/pay",payDue);
export default router;
