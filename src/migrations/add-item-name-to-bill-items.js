import sequelize from "../config/database.js";
import { DataTypes } from "sequelize";

const addItemNameToBillItems = async () => {
  try {
    console.log('Adding item_name column to BillItems table...');
    
    await sequelize.query(`
      ALTER TABLE BillItems 
      ADD COLUMN item_name VARCHAR(255) NULL 
      AFTER price
    `);
    
    console.log('✅ item_name column added successfully to BillItems table');
  } catch (error) {
    if (error.message.includes('Duplicate column name')) {
      console.log('✅ item_name column already exists in BillItems table');
    } else {
      console.error('❌ Error adding item_name column to BillItems:', error);
      throw error;
    }
  }
};

// Run migration
addItemNameToBillItems()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });