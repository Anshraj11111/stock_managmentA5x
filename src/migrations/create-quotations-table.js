/**
 * Migration: Create Quotations & QuotationItems tables
 * Run: node src/migrations/create-quotations-table.js
 */

import dotenv from "dotenv";
dotenv.config();

import sequelize from "../config/database.js";
import Quotation from "../models/quotationModel.js";
import QuotationItem from "../models/quotationItemModel.js";

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log("✅ DB connected");

    // Sync Quotation table
    await Quotation.sync({ alter: true });
    console.log("✅ Quotations table created / updated");

    // Sync QuotationItems table
    await QuotationItem.sync({ alter: true });
    console.log("✅ QuotationItems table created / updated");

    console.log("🎉 Migration complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrate();
