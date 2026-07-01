// src/routes/customerRoutes.js

import express from "express";
import {
  getCustomers,
  searchCustomerByPhone,
  getCustomerById,
  createOrUpdateCustomer,
  recordPayment,
  deleteCustomer,
  deleteLedgerEntry,
} from "../controllers/customerController.js";
import authMiddleware from "../middlewares/authmiddleware.js";
import { cacheMiddleware } from "../middlewares/cache.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/",          cacheMiddleware(30), getCustomers);           // 30s
router.get("/search",    searchCustomerByPhone);                       // no cache (real-time search)
router.get("/:id",       cacheMiddleware(30), getCustomerById);        // 30s
router.post("/",         createOrUpdateCustomer);
router.post("/:id/payment", recordPayment);
router.delete("/:id/ledger/:entryId", deleteLedgerEntry);
router.delete("/:id",    deleteCustomer);

export default router;
