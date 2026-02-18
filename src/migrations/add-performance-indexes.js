// Migration to add performance indexes
export const up = async (queryInterface) => {
  // Products indexes
  await queryInterface.addIndex('Products', ['shop_id'], { name: 'idx_products_shop_id' });
  await queryInterface.addIndex('Products', ['product_name'], { name: 'idx_products_name' });
  
  // Bills indexes
  await queryInterface.addIndex('Bills', ['shop_id'], { name: 'idx_bills_shop_id' });
  await queryInterface.addIndex('Bills', ['status'], { name: 'idx_bills_status' });
  await queryInterface.addIndex('Bills', ['createdAt'], { name: 'idx_bills_created_at' });
  await queryInterface.addIndex('Bills', ['shop_id', 'status', 'createdAt'], { name: 'idx_bills_composite' });
  
  // BillItems indexes
  await queryInterface.addIndex('BillItems', ['bill_id'], { name: 'idx_billitems_bill_id' });
  await queryInterface.addIndex('BillItems', ['product_id'], { name: 'idx_billitems_product_id' });
  
  // Payments indexes
  await queryInterface.addIndex('Payments', ['bill_id'], { name: 'idx_payments_bill_id' });
  await queryInterface.addIndex('Payments', ['payment_mode'], { name: 'idx_payments_mode' });
  
  // Users indexes
  await queryInterface.addIndex('Users', ['shop_id'], { name: 'idx_users_shop_id' });
  await queryInterface.addIndex('Users', ['email'], { name: 'idx_users_email' });
};

export const down = async (queryInterface) => {
  await queryInterface.removeIndex('Products', 'idx_products_shop_id');
  await queryInterface.removeIndex('Products', 'idx_products_name');
  await queryInterface.removeIndex('Bills', 'idx_bills_shop_id');
  await queryInterface.removeIndex('Bills', 'idx_bills_status');
  await queryInterface.removeIndex('Bills', 'idx_bills_created_at');
  await queryInterface.removeIndex('Bills', 'idx_bills_composite');
  await queryInterface.removeIndex('BillItems', 'idx_billitems_bill_id');
  await queryInterface.removeIndex('BillItems', 'idx_billitems_product_id');
  await queryInterface.removeIndex('Payments', 'idx_payments_bill_id');
  await queryInterface.removeIndex('Payments', 'idx_payments_mode');
  await queryInterface.removeIndex('Users', 'idx_users_shop_id');
  await queryInterface.removeIndex('Users', 'idx_users_email');
};
