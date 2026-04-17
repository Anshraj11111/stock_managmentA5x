import { up } from './src/migrations/add-subscription-system.js';

(async () => {
  try {
    await up();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
})();
