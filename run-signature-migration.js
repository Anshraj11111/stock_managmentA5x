import updateSignatureColumn from './src/migrations/update-signature-column.js';

console.log('🚀 Running signature column migration...\n');

updateSignatureColumn()
  .then(() => {
    console.log('\n✅ Migration completed successfully!');
    console.log('📝 You can now upload signature images up to 1MB');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
