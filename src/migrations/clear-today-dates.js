import sequelize from "../config/database.js";

/**
 * Migration: Make date_added nullable and clear today's dates
 * Step 1: Alter column to allow NULL
 * Step 2: Clear today's dates
 */
const clearTodayDates = async () => {
  try {
    console.log("🔄 Starting migration: Make date_added nullable and clear today's dates...");

    // Step 1: Make date_added column nullable
    console.log("📝 Step 1: Making date_added column nullable...");
    await sequelize.query(`
      ALTER TABLE Products 
      MODIFY COLUMN date_added DATE NULL
    `);
    console.log("✅ Column is now nullable");

    // Step 2: Clear today's dates
    const today = new Date().toISOString().split('T')[0];
    console.log(`📝 Step 2: Clearing products with date_added = '${today}'...`);
    
    const [results] = await sequelize.query(`
      UPDATE Products 
      SET date_added = NULL 
      WHERE date_added = '${today}'
    `);

    console.log(`✅ Migration complete: Cleared date_added for products with today's date`);
    console.log(`📊 Affected rows: ${results.affectedRows || 0}`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
};

clearTodayDates();
