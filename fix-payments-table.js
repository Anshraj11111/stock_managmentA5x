import sequelize from './src/config/database.js';

(async () => {
  try {
    console.log('🔄 Fixing Payments and Subscription_History tables...');
    
    // Drop tables in correct order (child first, then parent)
    await sequelize.query('DROP TABLE IF EXISTS Subscription_History');
    console.log('✅ Dropped Subscription_History table');
    
    await sequelize.query('DROP TABLE IF EXISTS Payments');
    console.log('✅ Dropped Payments table');
    
    // Recreate Payments with correct structure
    await sequelize.query(`
      CREATE TABLE Payments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        shopId INT NOT NULL,
        paymentType VARCHAR(50) NOT NULL,
        planName VARCHAR(50),
        amount DECIMAL(10,2) NOT NULL,
        paymentScreenshot LONGTEXT,
        paymentDate DATETIME,
        verificationStatus VARCHAR(20) DEFAULT 'pending',
        verifiedBy INT,
        verifiedAt DATETIME,
        transactionId VARCHAR(100),
        upiRefNumber VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (shopId) REFERENCES Shops(id) ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
    console.log('✅ Created Payments table with camelCase columns');
    
    // Recreate Subscription_History
    await sequelize.query(`
      CREATE TABLE Subscription_History (
        id INT PRIMARY KEY AUTO_INCREMENT,
        shopId INT NOT NULL,
        planType VARCHAR(20) NOT NULL,
        planDuration VARCHAR(20),
        startDate DATE NOT NULL,
        endDate DATE NOT NULL,
        amountPaid DECIMAL(10,2) DEFAULT 0,
        paymentId INT,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shopId) REFERENCES Shops(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (paymentId) REFERENCES Payments(id)
      )
    `);
    console.log('✅ Created Subscription_History table with camelCase columns');
    
    console.log('🎉 All tables fixed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
