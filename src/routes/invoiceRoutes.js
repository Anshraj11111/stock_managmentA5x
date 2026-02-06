import express from "express";
import authMiddleware from "../middlewares/authmiddleware.js";
import { generateInvoice } from "../controllers/invoicecontroller.js";

const router = express.Router();

router.use(authMiddleware);
router.get("/:id", generateInvoice);

export default router;
