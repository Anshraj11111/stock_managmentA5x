// ================================
// server.js (PRODUCTION SAFE)
// ================================

// 1️⃣ Load env FIRST (Windows + ES Module safe)
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ ONLY load .env.local (priority file)
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// 2️⃣ Environment safety check

  const REQUIRED_ENVS = [
  "DATABASE_URL",
  "JWT_SECRET"
];



for (const key of REQUIRED_ENVS) {
  if (!process.env[key]) {
    console.error(`❌ Missing environment variable: ${key}`);
    process.exit(1);
  }
}

// 3️⃣ Load models AFTER dotenv (so database.js gets correct env vars)
import "./models/shopmodel.js";
import "./models/usermodel.js";
import "./models/productmodel.js";
import "./models/billmodel.js";
import "./models/billItemmodel.js";
import "./models/paymentmodel.js";
import "./models/adminmodel.js";
import "./models/customerModel.js";
import "./models/customerLedgerModel.js";

// 4️⃣ Imports AFTER env load and models
import app from "./app.js";
import sequelize from "./config/database.js";

const PORT = process.env.PORT || 5000;

// 4️⃣ Start server
const startServer = async () => {
  try {
    // ✅ Check DB connection only
    await sequelize.authenticate();
    console.log("✅ Database connected successfully");

    /**
     * Database sync - creates tables if they don't exist
     */
    if (process.env.NODE_ENV !== "production") {
      try {
        // Safe sync - only create tables if they don't exist, don't alter existing ones
        await sequelize.sync({ alter: false });
        console.log("🗄️ Database synced successfully");
      } catch (syncError) {
        console.error("❌ Database sync failed:", syncError.message);
      }
    }

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Server startup failed");
    console.error(error);
    process.exit(1);
  }
}; 

startServer();
