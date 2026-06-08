import express from "express";
import authMiddleware from "../middlewares/authmiddleware.js";
import shopMiddleware from "../middlewares/shopmiddleware.js";
import { cacheMiddleware } from "../middlewares/cache.js";
import {
  createQuotation,
  getQuotations,
  getQuotationById,
  updateQuotation,
  deleteQuotation,
  updateQuotationStatus,
  convertToBill,
  generateQuotationPDF,
  getQuotationStats,
} from "../controllers/quotationController.js";

const router = express.Router();

// All routes require auth + shop validation
router.use(authMiddleware);
router.use(shopMiddleware);

// ── CRUD ─────────────────────────────────────────
router.post("/", createQuotation);                          // Create
router.get("/", cacheMiddleware(5), getQuotations);         // List (paginated)
router.get("/stats", cacheMiddleware(10), getQuotationStats); // Stats
router.get("/:id", cacheMiddleware(5), getQuotationById);   // Single
router.put("/:id", updateQuotation);                        // Edit
router.delete("/:id", deleteQuotation);                     // Delete

// ── STATUS & ACTIONS ─────────────────────────────
router.patch("/:id/status", updateQuotationStatus);         // Change status
router.post("/:id/convert", convertToBill);                 // Convert to bill

// ── PDF ──────────────────────────────────────────
router.get("/:id/pdf", generateQuotationPDF);               // Download PDF

export default router;
