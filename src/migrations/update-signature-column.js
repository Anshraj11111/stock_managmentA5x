import sequelize from '../config/database.js';

/**
 * Migration to update signature_image column from TEXT to LONGTEXT
 * This allows storing larger base64 encoded images (up to 4GB)
 */
async function updateSignatureColumn() {
  try {
    console.log('🔄 Starting signature_image column migration...');
    
    // Update the column type to LONGTEXT
    await sequelize.query(`
      ALTER TABLE Shops 
      MODIFY COLUMN signature_image LONGTEXT;
    `);
    
    console.log('✅ Successfully updated signature_image column to LONGTEXT');
    console.log('📊 New column can store up to 4GB of data');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  updateSignatureColumn()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

export default updateSignatureColumn;
