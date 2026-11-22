/**
 * Run Bill Counter Migration
 */

import dotenv from 'dotenv';
import createBillCounterSystem from './src/migrations/create-bill-counter.js';
import sequelize from './src/config/database.js';

// Load environment variables
dotenv.config();

const runMigration = async () => {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');
    
    console.log('🔢 Creating bill counter system...');
    await createBillCounterSystem();
    
    console.log('✅ Bill counter migration completed!');
    console.log('🎯 Sequential bill numbers are now ready!');
    
    await sequelize.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await sequelize.close();
    process.exit(1);
  }
};

runMigration();