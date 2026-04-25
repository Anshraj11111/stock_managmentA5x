import sequelize from '../config/database.js';
import '../models/shopmodel.js';
import '../models/usermodel.js';
import '../models/productmodel.js';
import '../models/billmodel.js';
import '../models/billItemmodel.js';
import '../models/billPaymentModel.js';
import '../models/paymentmodel.js';

export const syncDatabase = async () => {
  try {
    console.log('🔄 Syncing database with indexes...');
    
    // Sync all models with indexes
    await sequelize.sync({ alter: true });
    
    console.log('✅ Database synced successfully with all indexes!');
  } catch (error) {
    console.error('❌ Database sync failed:', error);
    throw error;
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  syncDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
