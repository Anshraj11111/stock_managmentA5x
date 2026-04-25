import dotenv from 'dotenv';
dotenv.config();

import { addGoogleOAuthFields } from './src/migrations/add-google-oauth-fields.js';

console.log("🚀 Starting Google OAuth migration...");

addGoogleOAuthFields()
  .then(() => {
    console.log("✅ Migration completed successfully!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  });
