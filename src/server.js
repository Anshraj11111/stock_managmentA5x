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

// Load .env from backend root
dotenv.config();

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

// 3️⃣ Imports AFTER env load
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
     * ❌ NEVER use alter/force in real SaaS
     * It creates duplicate indexes (64 keys error)
     *
     * 👉 Use alter ONLY when you intentionally change schema
     */
    if (process.env.NODE_ENV !== "production") {
      // ❌ COMMENT THIS AFTER FIRST SUCCESSFUL RUN
      // await sequelize.sync({ alter: true });

      // ✅ Safe sync
      // await sequelize.sync();
      console.log("🗄️ Database synced (alter mode)");
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
