import sequelize from './src/config/database.js';

const verifyTable = async () => {
  try {
    const [results] = await sequelize.query(`
      SHOW TABLES LIKE 'BillPayments'
    `);
    
    if (results.length > 0) {
      console.log('✅ BillPayments table exists');
      
      // Show table structure
      const [columns] = await sequelize.query(`
        DESCRIBE BillPayments
      `);
      
      console.log('\n📋 Table Structure:');
      console.table(columns);
    } else {
      console.log('❌ BillPayments table does not exist');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

verifyTable();
