// Migration to update payment_mode ENUM to include 'credit' and 'card'

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local first, then .env
dotenv.config({ path: join(__dirname, '../../.env.local') });
dotenv.config({ path: join(__dirname, '../../.env') });

import sequelize from '../config/database.js';

const updatePaymentModeEnum = async () => {
  try {
    console.log('🔄 Updating payment_mode ENUM...');

    // Drop the existing ENUM constraint and recreate with new values
    await sequelize.query(`
      ALTER TABLE Payments 
      MODIFY COLUMN payment_mode ENUM('cash', 'upi', 'card', 'credit', 'mixed') NOT NULL;
    `);

    console.log('✅ Payment mode ENUM updated successfully!');
    console.log('   New values: cash, upi, card, credit, mixed');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

updatePaymentModeEnum();
