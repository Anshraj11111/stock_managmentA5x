import sequelize from './src/config/database.js';

(async () => {
  try {
    const [results] = await sequelize.query('DESCRIBE Payments');
    console.log('Payments table structure:');
    console.table(results);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
