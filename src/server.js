import dotenv from "dotenv";
dotenv.config();

// 3️⃣ Load models AFTER dotenv
import "./models/shopmodel.js";
import "./models/usermodel.js";
import "./models/productmodel.js";
import "./models/billmodel.js";
import "./models/billItemmodel.js";
import "./models/paymentmodel.js";
import "./models/adminmodel.js";
import "./models/customerModel.js";
import "./models/customerLedgerModel.js";

import app from "./app.js";
import sequelize from "./config/database.js";

const PORT = process.env.PORT || 5000;

const runMigrations = async () => {
  try {
    // Fix customer_phone column length (VARCHAR 10 -> 15)
    await sequelize.query(`
      ALTER TABLE \`Bills\`
      MODIFY COLUMN \`customer_phone\` VARCHAR(15) NULL DEFAULT NULL
    `);
    console.log("✅ Migration: customer_phone column updated");
  } catch (err) {
    // Ignore if already correct or table doesn't exist yet
    console.log("ℹ️  Migration skipped:", err.message);
  }
};

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected successfully");

    // Sync tables (create if not exist, don't alter)
    await sequelize.sync({ alter: false });
    console.log("🗄️ Database synced successfully");

    // Run any pending migrations
    await runMigrations();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
