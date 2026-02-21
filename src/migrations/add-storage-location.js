// Migration to add storage_location column to products table

import sequelize from '../config/database.js';

const addStorageLocationColumn = async () => {
  try {
    console.log('🔄 Adding storage_location column to products table...');

    // Check if column already exists
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'Products' 
      AND COLUMN_NAME = 'storage_location'
    `);

    if (results.length > 0) {
      console.log('✅ storage_location column already exists!');
      process.exit(0);
    }

    // Add column if it doesn't exist
    await sequelize.query(`
      ALTER TABLE Products 
      ADD COLUMN storage_location VARCHAR(255) DEFAULT NULL
      AFTER low_stock_threshold
    `);

    console.log('✅ storage_location column added successfully!');
    console.log('📦 Products can now have storage location (Rack/Godown info)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
};

addStorageLocationColumn();
