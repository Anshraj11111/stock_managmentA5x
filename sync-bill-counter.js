/**
 * Sync Bill Counter with existing bills
 * Run this to fix bill number conflicts
 */

import sequelize from './src/config/database.js';

(async () => {
  try {
    const shopId = 1; // Change this if needed
    
    // Get all 3-digit numeric bill numbers (001, 002, etc.) for this shop
    // Ignore old timestamp-based bill numbers
    const result = await sequelize.query(
      `SELECT bill_number FROM Bills 
       WHERE shop_id = ? 
       AND bill_number REGEXP '^[0-9]{1,5}$'
       AND CAST(bill_number AS UNSIGNED) < 100000
       ORDER BY CAST(bill_number AS UNSIGNED) DESC
       LIMIT 1`,
      {
        replacements: [shopId],
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    let maxNumber = 0;
    if (result.length > 0 && result[0].bill_number) {
      maxNumber = parseInt(result[0].bill_number);
    }
    
    console.log(`Old timestamp-based bills will be ignored (e.g., BILL-1777310604884)`);
    console.log(`Looking for sequential numbers only (001, 002, 003, etc.)`);
    
    console.log(`📊 Highest numeric bill number found: ${maxNumber}`);
    
    // Update the counter
    await sequelize.query(
      'UPDATE BillCounters SET current_number = ? WHERE shop_id = ?',
      {
        replacements: [maxNumber, shopId],
        type: sequelize.QueryTypes.UPDATE
      }
    );
    
    console.log(`✅ BillCounter synced! Next bill will be: ${String(maxNumber + 1).padStart(3, '0')}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
