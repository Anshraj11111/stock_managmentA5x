// Migration to add clothes-specific columns to products table
// Adds: sub_category, size, brand_name columns
// Note: date_added already exists from previous migration

import sequelize from '../config/database.js';
import { DataTypes } from 'sequelize';

export const up = async () => {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('🔄 Starting migration: Adding clothes category fields to Products table...');

    // Check which columns already exist
    const tableDescription = await queryInterface.describeTable('Products');
    
    // Add sub_category column if it doesn't exist
    if (!tableDescription.sub_category) {
      await queryInterface.addColumn('Products', 'sub_category', {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
      });
      console.log('✅ Added sub_category column');
    } else {
      console.log('ℹ️  sub_category column already exists');
    }
    
    // Add size column if it doesn't exist
    if (!tableDescription.size) {
      await queryInterface.addColumn('Products', 'size', {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
      });
      console.log('✅ Added size column');
    } else {
      console.log('ℹ️  size column already exists');
    }
    
    // Add brand_name column if it doesn't exist
    if (!tableDescription.brand_name) {
      await queryInterface.addColumn('Products', 'brand_name', {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null,
      });
      console.log('✅ Added brand_name column');
    } else {
      console.log('ℹ️  brand_name column already exists');
    }
    
    // Note: date_added column already exists from add-product-dates.js migration
    // Verify it exists and ensure it allows NULL values per requirements 2.4, 2.6, 14.4
    if (tableDescription.date_added) {
      console.log('ℹ️  date_added column already exists (from previous migration)');
      
      // Check if date_added allows NULL - if not, modify it to allow NULL
      if (tableDescription.date_added.allowNull === false) {
        console.log('🔄 Modifying date_added to allow NULL values (per requirements 2.4, 2.6, 14.4)...');
        await queryInterface.changeColumn('Products', 'date_added', {
          type: DataTypes.DATEONLY,
          allowNull: true,
          defaultValue: null,
        });
        console.log('✅ Modified date_added to allow NULL values');
      } else {
        console.log('ℹ️  date_added already allows NULL values');
      }
    } else {
      console.log('⚠️  Warning: date_added column does not exist. Run add-product-dates.js migration first.');
    }
    
    // Add indexes for better query performance
    console.log('🔄 Adding indexes for sub_category and brand_name...');
    
    try {
      await queryInterface.addIndex('Products', ['sub_category'], {
        name: 'products_sub_category_idx',
      });
      console.log('✅ Added index on sub_category');
    } catch (error) {
      if (error.message.includes('Duplicate key name')) {
        console.log('ℹ️  Index on sub_category already exists');
      } else {
        throw error;
      }
    }
    
    try {
      await queryInterface.addIndex('Products', ['brand_name'], {
        name: 'products_brand_name_idx',
      });
      console.log('✅ Added index on brand_name');
    } catch (error) {
      if (error.message.includes('Duplicate key name')) {
        console.log('ℹ️  Index on brand_name already exists');
      } else {
        throw error;
      }
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('📦 Products table now supports clothes-specific fields');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

export const down = async () => {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('🔄 Starting rollback: Removing clothes category fields from Products table...');
    
    // Remove indexes
    try {
      await queryInterface.removeIndex('Products', 'products_sub_category_idx');
      console.log('✅ Removed index on sub_category');
    } catch (error) {
      console.log('ℹ️  Index on sub_category does not exist or already removed');
    }
    
    try {
      await queryInterface.removeIndex('Products', 'products_brand_name_idx');
      console.log('✅ Removed index on brand_name');
    } catch (error) {
      console.log('ℹ️  Index on brand_name does not exist or already removed');
    }
    
    // Remove columns
    const tableDescription = await queryInterface.describeTable('Products');
    
    if (tableDescription.sub_category) {
      await queryInterface.removeColumn('Products', 'sub_category');
      console.log('✅ Removed sub_category column');
    }
    
    if (tableDescription.size) {
      await queryInterface.removeColumn('Products', 'size');
      console.log('✅ Removed size column');
    }
    
    if (tableDescription.brand_name) {
      await queryInterface.removeColumn('Products', 'brand_name');
      console.log('✅ Removed brand_name column');
    }
    
    // Note: We do NOT remove date_added as it was added by a different migration
    console.log('ℹ️  date_added column retained (managed by add-product-dates.js migration)');
    
    console.log('✅ Rollback completed successfully!');
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
};

// Run migration if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  up()
    .then(() => {
      console.log('Migration script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}
