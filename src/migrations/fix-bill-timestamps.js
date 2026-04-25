import sequelize from '../config/database.js';

export const fixBillTimestamps = async () => {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('🔄 Fixing Bill table timestamp columns...');

    // Check if createdAt exists (PascalCase)
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'Bills' 
      AND COLUMN_NAME IN ('createdAt', 'updatedAt', 'created_at', 'updated_at')
    `);

    const existingColumns = results.map(r => r.COLUMN_NAME);
    console.log('Existing timestamp columns:', existingColumns);

    // If we have PascalCase columns, rename them to snake_case
    if (existingColumns.includes('createdAt')) {
      await sequelize.query(`
        ALTER TABLE Bills 
        CHANGE COLUMN createdAt created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      `);
      console.log('✅ Renamed createdAt to created_at');
    }

    if (existingColumns.includes('updatedAt')) {
      await sequelize.query(`
        ALTER TABLE Bills 
        CHANGE COLUMN updatedAt updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      `);
      console.log('✅ Renamed updatedAt to updated_at');
    }

    // If columns don't exist at all, add them
    if (!existingColumns.includes('created_at') && !existingColumns.includes('createdAt')) {
      await sequelize.query(`
        ALTER TABLE Bills 
        ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      `);
      console.log('✅ Added created_at column');
    }

    if (!existingColumns.includes('updated_at') && !existingColumns.includes('updatedAt')) {
      await sequelize.query(`
        ALTER TABLE Bills 
        ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      `);
      console.log('✅ Added updated_at column');
    }

    console.log('✅ Bill table timestamp columns fixed successfully!');
  } catch (error) {
    console.error('❌ Error fixing Bill timestamps:', error);
    throw error;
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixBillTimestamps()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
