import sequelize from "../config/database.js";
import Admin from "../models/adminmodel.js";

const createAdminTable = async () => {
  try {
    console.log("🔄 Creating Admin table...");
    
    // Sync the Admin model (creates table if it doesn't exist)
    await Admin.sync({ force: false });
    
    console.log("✅ Admin table created successfully!");
    console.log("📋 Table structure:");
    console.log("   - id (INTEGER, PRIMARY KEY, AUTO_INCREMENT)");
    console.log("   - name (STRING(100), NOT NULL)");
    console.log("   - email (STRING, UNIQUE, NOT NULL)");
    console.log("   - password (STRING, NOT NULL)");
    console.log("   - role (ENUM: super_admin, support_admin)");
    console.log("   - is_active (BOOLEAN, DEFAULT: true)");
    console.log("   - createdAt (DATE)");
    console.log("   - updatedAt (DATE)");
    console.log("📊 Indexes created on: email, role, is_active");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating Admin table:", error);
    process.exit(1);
  }
};

const dropAdminTable = async () => {
  try {
    console.log("🔄 Dropping Admin table...");
    
    await Admin.drop();
    
    console.log("✅ Admin table dropped successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error dropping Admin table:", error);
    process.exit(1);
  }
};

// Check command line arguments
const command = process.argv[2];

if (command === "up") {
  createAdminTable();
} else if (command === "down") {
  dropAdminTable();
} else {
  console.log("Usage:");
  console.log("  node src/migrations/create-admin-table.js up   - Create Admin table");
  console.log("  node src/migrations/create-admin-table.js down - Drop Admin table");
  process.exit(1);
}
