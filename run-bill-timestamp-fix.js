import { fixBillTimestamps } from './src/migrations/fix-bill-timestamps.js';

fixBillTimestamps()
  .then(() => {
    console.log('✅ Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
