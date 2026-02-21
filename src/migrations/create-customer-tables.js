// Migration: Create Customer and CustomerLedger tables
// Run: node src/migrations/create-customer-tables.js

import sequelize from "../config/database.js";
import Customer from "../models/customerModel.js";
import CustomerLedger from "../models/customerLedgerModel.js";

const runMigration = async () => {
  try {
    console.log("🔄 Starting Customer tables migration...");

    // Create Customer table
    await Customer.sync({ alter: true });
    console.log("✅ Customer table created/updated");

    // Create CustomerLedger table
    await CustomerLedger.sync({ alter: true });
    console.log("✅ CustomerLedger table created/updated");

    console.log("✅ Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
};

runMigration();
