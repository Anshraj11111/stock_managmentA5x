// Migration runner for clothes category fields
// This script adds sub_category, size, and brand_name columns to the Products table

import { up } from './src/migrations/add-clothes-category-fields.js';

console.log('🚀 Running clothes category migration...\n');

up()
  .then(() => {
    console.log('\n✅ Migration completed successfully!');
    console.log('📝 Products table now supports clothes-specific fields');
    console.log('💡 Run verification: node backend/verify-clothes-implementation.js');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
