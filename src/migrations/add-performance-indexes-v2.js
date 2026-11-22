import sequelize from "../config/database.js";

const addPerformanceIndexes = async () => {
  try {
    console.log("🚀 Adding performance indexes...");
    
    const queries = [
      // ✅ Bills table indexes for faster queries
      `CREATE INDEX IF NOT EXISTS idx_bills_shop_created 
       ON Bills(shop_id, created_at DESC)`,
      
      `CREATE INDEX IF NOT EXISTS idx_bills_shop_status 
       ON Bills(shop_id, status)`,
      
      `CREATE INDEX IF NOT EXISTS idx_bills_customer 
       ON Bills(customer_id)`,
      
      // ✅ BillItems table indexes
      `CREATE INDEX IF NOT EXISTS idx_billitems_bill 
       ON BillItems(bill_id)`,
       
      `CREATE INDEX IF NOT EXISTS idx_billitems_product 
       ON BillItems(product_id)`,
      
      // ✅ BillPayments table indexes
      `CREATE INDEX IF NOT EXISTS idx_billpayments_bill 
       ON BillPayments(bill_id)`,
      
      // ✅ Products table indexes for faster lookups
      `CREATE INDEX IF NOT EXISTS idx_products_shop_name 
       ON Products(shop_id, product_name)`,
       
      `CREATE INDEX IF NOT EXISTS idx_products_shop_stock 
       ON Products(shop_id, stock_quantity)`,
       
      // ✅ Customers table indexes
      `CREATE INDEX IF NOT EXISTS idx_customers_shop_phone 
       ON Customers(shop_id, phone)`,
    ];

    for (const query of queries) {
      await sequelize.query(query);
    }

    console.log("✅ Performance indexes added successfully!");
  } catch (error) {
    console.log("⚠️ Some indexes might already exist:", error.message);
  }
};

// Run migration
addPerformanceIndexes();