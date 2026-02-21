// Run this to fix payment_mode ENUM
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.local') });
dotenv.config({ path: join(__dirname, '.env') });

import sequelize from './src/config/database.js';

const fixEnum = async () => {
  try {
    console.log('🔄 Connecting to database...');
    console.log('   DATABASE_URL:', process.env.DATABASE_URL);
    
    await sequelize.authenticate();
    console.log('✅ Connected successfully!');
    
    console.log('🔄 Updating payment_mode ENUM...');

    await sequelize.query(`
      ALTER TABLE Payments 
      MODIFY COLUMN payment_mode ENUM('cash', 'upi', 'card', 'credit', 'mixed') NOT NULL;
    `);

    console.log('✅ Payment mode ENUM updated successfully!');
    console.log('   New values: cash, upi, card, credit, mixed');
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
};

fixEnum();
