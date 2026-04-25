import sequelize from "../config/database.js";
import { DataTypes } from "sequelize";

/**
 * Migration: Add Google OAuth fields to Users table
 * Adds: google_id, auth_provider columns
 */
export const addGoogleOAuthFields = async () => {
  const queryInterface = sequelize.getQueryInterface();

  try {
    console.log("🔄 Adding Google OAuth fields to Users table...");

    // Add google_id column (without unique constraint initially)
    await queryInterface.addColumn("Users", "google_id", {
      type: DataTypes.STRING,
      allowNull: true,
    });

    // Add auth_provider column (email, google)
    await queryInterface.addColumn("Users", "auth_provider", {
      type: DataTypes.ENUM("email", "google"),
      defaultValue: "email",
      allowNull: false,
    });

    // Make password nullable for Google OAuth users
    await queryInterface.changeColumn("Users", "password", {
      type: DataTypes.STRING,
      allowNull: true, // Google users won't have password
    });

    // Add unique index on google_id separately
    try {
      await queryInterface.addIndex("Users", ["google_id"], {
        unique: true,
        name: "users_google_id_unique",
      });
      console.log("✅ Unique index on google_id added");
    } catch (indexError) {
      console.log("⚠️ Index might already exist or not supported:", indexError.message);
    }

    console.log("✅ Google OAuth fields added successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    throw error;
  }
};

// Run migration if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addGoogleOAuthFields()
    .then(() => {
      console.log("Migration completed");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}
