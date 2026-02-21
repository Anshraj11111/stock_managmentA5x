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

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// GET all customers (shop-wise)
router.get("/", getCustomers);

// SEARCH customer by phone
router.get("/search", searchCustomerByPhone);

// GET single customer with ledger
router.get("/:id", getCustomerById);

// CREATE or UPDATE customer
router.post("/", createOrUpdateCustomer);

// RECORD payment
router.post("/:id/payment", recordPayment);

// DELETE ledger entry
router.delete("/:id/ledger/:entryId", deleteLedgerEntry);

// DELETE customer (only if no dues)
router.delete("/:id", deleteCustomer);

export default router;
