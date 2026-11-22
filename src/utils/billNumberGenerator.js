/**
 * Sequential Bill Number Generator
 * Generates proper sequential bill numbers like 01, 02, 03...
 */

import sequelize from '../config/database.js';
import BillCounter from '../models/billCounterModel.js';

/**
 * Generate next sequential bill number for a shop
 * @param {number} shopId - Shop ID
 * @param {object} transaction - Database transaction
 * @returns {string} - Formatted bill number (e.g., "001", "002")
 */
export const getNextBillNumber = async (shopId, transaction) => {
  try {
    // ✅ Use atomic increment with row locking to prevent race conditions
    const [counter] = await sequelize.query(
      `UPDATE BillCounters 
       SET current_number = current_number + 1 
       WHERE shop_id = ?`,
      {
        replacements: [shopId],
        transaction,
        type: sequelize.QueryTypes.UPDATE
      }
    );
    
    // Get the updated counter value
    const billCounter = await BillCounter.findOne({
      where: { shop_id: shopId },
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    
    if (!billCounter) {
      // Create counter if doesn't exist (failsafe)
      const newCounter = await BillCounter.create({
        shop_id: shopId,
        current_number: 1,
        prefix: '',
        suffix: ''
      }, { transaction });
      
      return formatBillNumber(1, newCounter.prefix, newCounter.suffix);
    }
    
    return formatBillNumber(
      billCounter.current_number, 
      billCounter.prefix, 
      billCounter.suffix
    );
    
  } catch (error) {
    console.error('❌ Bill number generation failed:', error);
    throw new Error('Failed to generate bill number');
  }
};

/**
 * Format bill number with padding and prefix/suffix
 * @param {number} number - Sequential number
 * @param {string} prefix - Prefix (optional)
 * @param {string} suffix - Suffix (optional)
 * @returns {string} - Formatted bill number
 */
const formatBillNumber = (number, prefix = '', suffix = '') => {
  // ✅ Pad with zeros to make it 3 digits minimum (001, 002, etc.)
  const paddedNumber = number.toString().padStart(3, '0');
  
  return `${prefix}${paddedNumber}${suffix}`;
};

/**
 * Reset bill counter for a shop (admin function)
 * @param {number} shopId - Shop ID
 * @param {number} startFrom - Starting number (default: 0)
 */
export const resetBillCounter = async (shopId, startFrom = 0) => {
  const transaction = await sequelize.transaction();
  
  try {
    await BillCounter.update(
      { current_number: startFrom },
      { where: { shop_id: shopId }, transaction }
    );
    
    await transaction.commit();
    console.log(`✅ Bill counter reset for shop ${shopId}, starting from ${startFrom + 1}`);
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Counter reset failed:', error);
    throw error;
  }
};

/**
 * Set custom prefix/suffix for bill numbers
 * @param {number} shopId - Shop ID
 * @param {string} prefix - Prefix (e.g., "INV")
 * @param {string} suffix - Suffix (e.g., "-2024")
 */
export const setBillNumberFormat = async (shopId, prefix = '', suffix = '') => {
  const transaction = await sequelize.transaction();
  
  try {
    await BillCounter.update(
      { prefix, suffix },
      { where: { shop_id: shopId }, transaction }
    );
    
    await transaction.commit();
    console.log(`✅ Bill format updated for shop ${shopId}: ${prefix}XXX${suffix}`);
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Format update failed:', error);
    throw error;
  }
};