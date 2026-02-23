// Migration to add expiry_date and date_added fields to products table

import sequelize from '../config/database.js';
import { DataTypes } from 'sequelize';

const addProductDateFields = async () => {
  const queryInterface = sequelize.getQueryInterface();

  try {
    console.log('🔄 Starting migration: Adding date fields to products table...');

    // Check if columns already exist
    const tableDescription = await queryInterface.describeTable('Products');
    
    // Add expiry_date field (optional) if it doesn't exist
    if (!tableDescription.expiry_date) {
      await queryInterface.addColumn('Products', 'expiry_date', {
        type: DataTypes.DATEONLY,
        allowNull: true,
        defaultValue: null,
      });
      console.log('✅ Added expiry_date column');
    } else {
      console.log('ℹ️  expiry_date column already exists');
    }

    // Add date_added field if it doesn't exist
    if (!tableDescription.date_added) {
      // Add date_added field (nullable first, then update)
      await queryInterface.addColumn('Products', 'date_added', {
        type: DataTypes.DATEONLY,
        allowNull: true,
        defaultValue: null,
      });
      console.log('✅ Added date_added column');

      // Update existing products to have date_added as today's date
      await sequelize.query(`
        UPDATE Products 
        SET date_added = CURDATE()
        WHERE date_added IS NULL
      `);
      console.log('✅ Updated existing products with date_added');

      // Now make it NOT NULL
      await queryInterface.changeColumn('Products', 'date_added', {
        type: DataTypes.DATEONLY,
        allowNull: false,
      });
      console.log('✅ Changed date_added to NOT NULL');
    } else {
      console.log('ℹ️  date_added column already exists');
    }

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

// Run migration
addProductDateFields()
  .then(() => {
    console.log('Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
