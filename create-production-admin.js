/**
 * Create Production Admin Account
 * Run this on Render console or local with production DB
 */

import bcrypt from 'bcrypt';
import sequelize from './src/config/database.js';

(async () => {
  try {
    console.log('🔧 Creating production admin account...');
    
    const adminData = {
      name: 'Production Admin',
      email: 'admin@stocksaas.com',
      password: 'ProductionAdmin@2024',
      role: 'super_admin'
    };

    console.log('Email:', adminData.email);
    console.log('Password:', adminData.password);
    console.log('Admin Code:', process.env.ADMIN_CODE || 'H5');
    console.log('---');

    // Hash password
    const hashedPassword = await bcrypt.hash(adminData.password, 8);

    // Check if admin already exists
    const [existing] = await sequelize.query(
      'SELECT id FROM Admins WHERE email = ?',
      {
        replacements: [adminData.email],
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (existing) {
      console.log('⚠️  Admin already exists, updating password...');
      await sequelize.query(
        'UPDATE Admins SET password = ?, name = ?, role = ? WHERE email = ?',
        {
          replacements: [hashedPassword, adminData.name, adminData.role, adminData.email],
          type: sequelize.QueryTypes.UPDATE
        }
      );
      console.log('✅ Admin password updated!');
    } else {
      console.log('Creating new admin...');
      await sequelize.query(
        `INSERT INTO Admins (name, email, password, role, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, NOW(), NOW())`,
        {
          replacements: [
            adminData.name,
            adminData.email,
            hashedPassword,
            adminData.role
          ],
          type: sequelize.QueryTypes.INSERT
        }
      );
      console.log('✅ Admin created successfully!');
    }

    console.log('');
    console.log('📋 PRODUCTION LOGIN CREDENTIALS:');
    console.log('================================');
    console.log('Email:', adminData.email);
    console.log('Password:', adminData.password);
    console.log('Admin Code:', process.env.ADMIN_CODE || 'H5');
    console.log('');
    console.log('⚠️  SAVE THESE CREDENTIALS SECURELY!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
})();
