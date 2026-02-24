import sequelize from '../config/database.js';
import { QueryTypes } from 'sequelize';

const addIsSuspendedToShops = async () => {
  try {
    console.log('🔄 Starting migration: Add isSuspended to Shops...');

    // Check if column already exists
    const [columns] = await sequelize.query(
      "SHOW COLUMNS FROM `Shops` LIKE 'isSuspended'",
      { type: QueryTypes.SELECT }
    );

    if (!columns) {
      console.log('➕ Adding isSuspended column...');
      await sequelize.query(`
        ALTER TABLE \`Shops\`
        ADD COLUMN \`isSuspended\` TINYINT(1) NOT NULL DEFAULT 0 AFTER \`subscription_active\`
      `);
      console.log('✅ isSuspended column added successfully');
    } else {
      console.log('⏭️  isSuspended column already exists');
    }

    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

// Run migration
addIsSuspendedToShops()
  .then(() => {
    console.log('✅ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration error:', error);
    process.exit(1);
  });
