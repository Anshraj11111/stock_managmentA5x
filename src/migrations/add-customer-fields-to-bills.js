// Migration to add customer fields to Bills table
import sequelize from '../config/database.js';
import { QueryTypes } from 'sequelize';

const addCustomerFieldsToBills = async () => {
  try {
    console.log('🔄 Starting migration: Add customer fields to Bills table...');

    // Check if customer_id column exists
    const [columns] = await sequelize.query(
      "SHOW COLUMNS FROM `Bills` LIKE 'customer_id'",
      { type: QueryTypes.SELECT }
    );

    if (!columns) {
      console.log('➕ Adding customer_id column...');
      await sequelize.query(`
        ALTER TABLE \`Bills\`
        ADD COLUMN \`customer_id\` INT NULL DEFAULT NULL AFTER \`shop_id\`,
        ADD INDEX \`customer_id_idx\` (\`customer_id\`)
      `);
      console.log('✅ customer_id column added');
    } else {
      console.log('⏭️  customer_id column already exists');
    }

    // Check if customer_name column exists
    const [nameColumn] = await sequelize.query(
      "SHOW COLUMNS FROM `Bills` LIKE 'customer_name'",
      { type: QueryTypes.SELECT }
    );

    if (!nameColumn) {
      console.log('➕ Adding customer_name column...');
      await sequelize.query(`
        ALTER TABLE \`Bills\`
        ADD COLUMN \`customer_name\` VARCHAR(100) NULL DEFAULT NULL AFTER \`customer_id\`
      `);
      console.log('✅ customer_name column added');
    } else {
      console.log('⏭️  customer_name column already exists');
    }

    // Check if customer_phone column exists
    const [phoneColumn] = await sequelize.query(
      "SHOW COLUMNS FROM `Bills` LIKE 'customer_phone'",
      { type: QueryTypes.SELECT }
    );

    if (!phoneColumn) {
      console.log('➕ Adding customer_phone column...');
      await sequelize.query(`
        ALTER TABLE \`Bills\`
        ADD COLUMN \`customer_phone\` VARCHAR(10) NULL DEFAULT NULL AFTER \`customer_name\`
      `);
      console.log('✅ customer_phone column added');
    } else {
      console.log('⏭️  customer_phone column already exists');
    }

    // Check if subtotal_amount column exists
    const [subtotalColumn] = await sequelize.query(
      "SHOW COLUMNS FROM `Bills` LIKE 'subtotal_amount'",
      { type: QueryTypes.SELECT }
    );

    if (!subtotalColumn) {
      console.log('➕ Adding subtotal_amount column...');
      await sequelize.query(`
        ALTER TABLE \`Bills\`
        ADD COLUMN \`subtotal_amount\` FLOAT NOT NULL DEFAULT 0 AFTER \`customer_phone\`
      `);
      console.log('✅ subtotal_amount column added');
    } else {
      console.log('⏭️  subtotal_amount column already exists');
    }

    // Check if gst_percentage column exists
    const [gstPercentageColumn] = await sequelize.query(
      "SHOW COLUMNS FROM `Bills` LIKE 'gst_percentage'",
      { type: QueryTypes.SELECT }
    );

    if (!gstPercentageColumn) {
      console.log('➕ Adding gst_percentage column...');
      await sequelize.query(`
        ALTER TABLE \`Bills\`
        ADD COLUMN \`gst_percentage\` FLOAT NULL DEFAULT NULL AFTER \`subtotal_amount\`
      `);
      console.log('✅ gst_percentage column added');
    } else {
      console.log('⏭️  gst_percentage column already exists');
    }

    // Check if gst_amount column exists
    const [gstAmountColumn] = await sequelize.query(
      "SHOW COLUMNS FROM `Bills` LIKE 'gst_amount'",
      { type: QueryTypes.SELECT }
    );

    if (!gstAmountColumn) {
      console.log('➕ Adding gst_amount column...');
      await sequelize.query(`
        ALTER TABLE \`Bills\`
        ADD COLUMN \`gst_amount\` FLOAT NULL DEFAULT NULL AFTER \`gst_percentage\`
      `);
      console.log('✅ gst_amount column added');
    } else {
      console.log('⏭️  gst_amount column already exists');
    }

    // Check if discount_percentage column exists
    const [discountPercentageColumn] = await sequelize.query(
      "SHOW COLUMNS FROM `Bills` LIKE 'discount_percentage'",
      { type: QueryTypes.SELECT }
    );

    if (!discountPercentageColumn) {
      console.log('➕ Adding discount_percentage column...');
      await sequelize.query(`
        ALTER TABLE \`Bills\`
        ADD COLUMN \`discount_percentage\` FLOAT NULL DEFAULT NULL AFTER \`gst_amount\`
      `);
      console.log('✅ discount_percentage column added');
    } else {
      console.log('⏭️  discount_percentage column already exists');
    }

    // Check if discount_amount column exists
    const [discountAmountColumn] = await sequelize.query(
      "SHOW COLUMNS FROM `Bills` LIKE 'discount_amount'",
      { type: QueryTypes.SELECT }
    );

    if (!discountAmountColumn) {
      console.log('➕ Adding discount_amount column...');
      await sequelize.query(`
        ALTER TABLE \`Bills\`
        ADD COLUMN \`discount_amount\` FLOAT NULL DEFAULT NULL AFTER \`discount_percentage\`
      `);
      console.log('✅ discount_amount column added');
    } else {
      console.log('⏭️  discount_amount column already exists');
    }

    console.log('✅ Migration completed successfully!');
    console.log('📊 Bills table now has customer and billing enhancement fields');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
};

// Run migration
addCustomerFieldsToBills()
  .then(() => {
    console.log('🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration error:', error);
    process.exit(1);
  });
