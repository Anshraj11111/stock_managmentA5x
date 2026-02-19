/**
 * Migration: Add Professional Billing Enhancement Fields
 * 
 * Adds customer details and GST fields to Bills table
 * All fields are optional for backward compatibility
 */

export const up = async (queryInterface, Sequelize) => {
  console.log('🔄 Adding professional billing enhancement fields...');

  try {
    // Add customer_name field
    await queryInterface.addColumn('Bills', 'customer_name', {
      type: Sequelize.STRING(100),
      allowNull: true,
      defaultValue: null,
    });
    console.log('✅ Added customer_name field');

    // Add customer_phone field
    await queryInterface.addColumn('Bills', 'customer_phone', {
      type: Sequelize.STRING(10),
      allowNull: true,
      defaultValue: null,
    });
    console.log('✅ Added customer_phone field');

    // Add subtotal_amount field
    await queryInterface.addColumn('Bills', 'subtotal_amount', {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0,
    });
    console.log('✅ Added subtotal_amount field');

    // Add gst_percentage field
    await queryInterface.addColumn('Bills', 'gst_percentage', {
      type: Sequelize.FLOAT,
      allowNull: true,
      defaultValue: null,
    });
    console.log('✅ Added gst_percentage field');

    // Add gst_amount field
    await queryInterface.addColumn('Bills', 'gst_amount', {
      type: Sequelize.FLOAT,
      allowNull: true,
      defaultValue: null,
    });
    console.log('✅ Added gst_amount field');

    // Update existing bills: set subtotal_amount = total_amount
    await queryInterface.sequelize.query(
      'UPDATE Bills SET subtotal_amount = total_amount WHERE subtotal_amount = 0'
    );
    console.log('✅ Updated existing bills with subtotal_amount');

    console.log('🎉 Professional billing enhancement migration completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

export const down = async (queryInterface) => {
  console.log('🔄 Removing professional billing enhancement fields...');

  try {
    await queryInterface.removeColumn('Bills', 'customer_name');
    await queryInterface.removeColumn('Bills', 'customer_phone');
    await queryInterface.removeColumn('Bills', 'subtotal_amount');
    await queryInterface.removeColumn('Bills', 'gst_percentage');
    await queryInterface.removeColumn('Bills', 'gst_amount');

    console.log('✅ Professional billing enhancement fields removed');
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
};
