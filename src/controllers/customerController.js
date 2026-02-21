// src/controllers/customerController.js

import Customer from "../models/customerModel.js";
import CustomerLedger from "../models/customerLedgerModel.js";
import { Op } from "sequelize";
import sequelize from "../config/database.js";

/**
 * GET ALL CUSTOMERS (Shop-wise)
 */
export const getCustomers = async (req, res) => {
  try {
    const customers = await Customer.findAll({
      where: { shop_id: req.user.shop_id },
      attributes: ['id', 'name', 'phone', 'address', 'total_due', 'createdAt', 'updatedAt'],
      order: [['total_due', 'DESC'], ['name', 'ASC']],
    });

    res.json(customers);
  } catch (error) {
    console.error("GET CUSTOMERS ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * SEARCH CUSTOMER BY PHONE
 */
export const searchCustomerByPhone = async (req, res) => {
  try {
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({ message: "Phone number required" });
    }

    const customer = await Customer.findOne({
      where: {
        shop_id: req.user.shop_id,
        phone: phone.trim(),
      },
      attributes: ['id', 'name', 'phone', 'address', 'total_due'],
    });

    if (!customer) {
      return res.json({ found: false, customer: null });
    }

    res.json({ found: true, customer });
  } catch (error) {
    console.error("SEARCH CUSTOMER ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET SINGLE CUSTOMER WITH LEDGER
 */
export const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findOne({
      where: {
        id,
        shop_id: req.user.shop_id,
      },
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Get ledger entries
    const ledger = await CustomerLedger.findAll({
      where: {
        customer_id: id,
        shop_id: req.user.shop_id,
      },
      order: [['createdAt', 'DESC']],
    });

    res.json({
      customer,
      ledger,
    });
  } catch (error) {
    console.error("GET CUSTOMER BY ID ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * CREATE OR UPDATE CUSTOMER
 */
export const createOrUpdateCustomer = async (req, res) => {
  try {
    const { name, phone, address } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ message: "Name and phone are required" });
    }

    // Check if customer exists
    let customer = await Customer.findOne({
      where: {
        shop_id: req.user.shop_id,
        phone: phone.trim(),
      },
    });

    if (customer) {
      // Update existing customer
      customer.name = name;
      customer.address = address || customer.address;
      await customer.save();

      return res.json({
        message: "Customer updated successfully",
        customer,
        isNew: false,
      });
    }

    // Create new customer
    customer = await Customer.create({
      shop_id: req.user.shop_id,
      name,
      phone: phone.trim(),
      address: address || null,
      total_due: 0,
    });

    res.status(201).json({
      message: "Customer created successfully",
      customer,
      isNew: true,
    });
  } catch (error) {
    console.error("CREATE/UPDATE CUSTOMER ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * RECORD PAYMENT
 */
export const recordPayment = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { amount, payment_mode, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Valid amount required" });
    }

    // Get customer
    const customer = await Customer.findOne({
      where: {
        id,
        shop_id: req.user.shop_id,
      },
      transaction,
    });

    if (!customer) {
      await transaction.rollback();
      return res.status(404).json({ message: "Customer not found" });
    }

    // Check if payment exceeds due
    if (parseFloat(amount) > parseFloat(customer.total_due)) {
      await transaction.rollback();
      return res.status(400).json({
        message: `Payment amount (₹${amount}) exceeds total due (₹${customer.total_due})`,
      });
    }

    // Create ledger entry (credit)
    await CustomerLedger.create({
      shop_id: req.user.shop_id,
      customer_id: id,
      type: 'credit',
      amount: amount,
      reference_type: 'payment',
      reference_id: null,
      description: description || `Payment received via ${payment_mode || 'cash'}`,
    }, { transaction });

    // Update customer total_due
    customer.total_due = parseFloat(customer.total_due) - parseFloat(amount);
    await customer.save({ transaction });

    await transaction.commit();

    res.json({
      message: "Payment recorded successfully",
      customer,
      payment_amount: amount,
      remaining_due: customer.total_due,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("RECORD PAYMENT ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * DELETE CUSTOMER (Only if no dues)
 */
export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findOne({
      where: {
        id,
        shop_id: req.user.shop_id,
      },
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    if (parseFloat(customer.total_due) > 0) {
      return res.status(400).json({
        message: `Cannot delete customer with pending dues of ₹${customer.total_due}`,
      });
    }

    await customer.destroy();

    res.json({ message: "Customer deleted successfully" });
  } catch (error) {
    console.error("DELETE CUSTOMER ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * DELETE LEDGER ENTRY
 */
export const deleteLedgerEntry = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id, entryId } = req.params;

    // Get the ledger entry
    const entry = await CustomerLedger.findOne({
      where: {
        id: entryId,
        customer_id: id,
        shop_id: req.user.shop_id,
      },
      transaction,
    });

    if (!entry) {
      await transaction.rollback();
      return res.status(404).json({ message: "Ledger entry not found" });
    }

    // Get customer
    const customer = await Customer.findOne({
      where: {
        id,
        shop_id: req.user.shop_id,
      },
      transaction,
    });

    if (!customer) {
      await transaction.rollback();
      return res.status(404).json({ message: "Customer not found" });
    }

    // Reverse the ledger entry effect on total_due
    if (entry.type === 'debit') {
      // If it was a debit (bill), reduce the total_due
      customer.total_due = parseFloat(customer.total_due) - parseFloat(entry.amount);
    } else if (entry.type === 'credit') {
      // If it was a credit (payment), increase the total_due
      customer.total_due = parseFloat(customer.total_due) + parseFloat(entry.amount);
    }

    await customer.save({ transaction });

    // Delete the ledger entry
    await entry.destroy({ transaction });

    await transaction.commit();

    res.json({
      message: "Ledger entry deleted successfully",
      customer,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("DELETE LEDGER ENTRY ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};
