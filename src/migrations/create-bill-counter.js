/**
 * Create Bill Counter System
 * Manages sequential bill numbers per shop
 */

import sequelize from '../config/database.js';

const createBillCounterSystem = async () => {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🔢 Creating bill counter system...');
    
    // Create BillCounters table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS BillCounters (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        current_number INT NOT NULL DEFAULT 0,
        prefix VARCHAR(10) DEFAULT '',
        suffix VARCHAR(10) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_shop_counter (shop_id),
        FOREIGN KEY (shop_id) REFERENCES Shops(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `, { transaction });
    
    // Initialize counters for existing shops
    await sequelize.query(`
      INSERT IGNORE INTO BillCounters (shop_id, current_number, prefix)
      SELECT id, 0, '' FROM Shops;
    `, { transaction });
    
    console.log('✅ Bill counter system created successfully!');
    
    await transaction.commit();
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Bill counter creation failed:', error);
    throw error;
  }
};

export default createBillCounterSystem;