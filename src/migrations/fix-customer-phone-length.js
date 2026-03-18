// Migration to fix customer_phone column length in Bills table
import sequelize from '../config/database.js';

const fixCustomerPhoneLength = async () => {
  try {
    console.log('🔄 Fixing customer_phone column length...');

    await sequelize.query(`
      ALTER TABLE \`Bills\`
      MODIFY COLUMN \`customer_phone\` VARCHAR(15) NULL DEFAULT NULL
    `);

    console.log('✅ customer_phone column updated to VARCHAR(15)');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
};

fixCustomerPhoneLength();
