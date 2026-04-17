import sequelize from '../config/database.js';

/**
 * Migration: Add Subscription System
 * 
 * This migration adds:
 * 1. Subscription fields to Shops table
 * 2. Payments table
 * 3. Subscription_History table
 * 4. Admin_Settings table
 */

export const up = async () => {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('🔄 Starting subscription system migration...');

    // 1. Add subscription fields to Shops table
    console.log('📝 Adding subscription fields to Shops table...');
    
    const shopsTableInfo = await queryInterface.describeTable('Shops');
    
    if (!shopsTableInfo.subscription_plan) {
      await queryInterface.addColumn('Shops', 'subscription_plan', {
        type: sequelize.Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'trial',
        comment: 'trial, basic_7m, basic_9m, basic_12m, premium_7m, premium_9m, premium_12m'
      });
    }

    if (!shopsTableInfo.subscription_start_date) {
      await queryInterface.addColumn('Shops', 'subscription_start_date', {
        type: sequelize.Sequelize.DATE,
        allowNull: true
      });
    }

    if (!shopsTableInfo.subscription_end_date) {
      await queryInterface.addColumn('Shops', 'subscription_end_date', {
        type: sequelize.Sequelize.DATE,
        allowNull: true
      });
    }

    if (!shopsTableInfo.deposit_paid) {
      await queryInterface.addColumn('Shops', 'deposit_paid', {
        type: sequelize.Sequelize.BOOLEAN,
        defaultValue: false
      });
    }

    if (!shopsTableInfo.deposit_amount) {
      await queryInterface.addColumn('Shops', 'deposit_amount', {
        type: sequelize.Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      });
    }

    if (!shopsTableInfo.deposit_refunded) {
      await queryInterface.addColumn('Shops', 'deposit_refunded', {
        type: sequelize.Sequelize.BOOLEAN,
        defaultValue: false
      });
    }

    if (!shopsTableInfo.deposit_refund_date) {
      await queryInterface.addColumn('Shops', 'deposit_refund_date', {
        type: sequelize.Sequelize.DATE,
        allowNull: true
      });
    }

    if (!shopsTableInfo.suspension_reason) {
      await queryInterface.addColumn('Shops', 'suspension_reason', {
        type: sequelize.Sequelize.TEXT,
        allowNull: true
      });
    }

    console.log('✅ Shops table updated');

    // 2. Create Payments table
    console.log('📝 Creating Payments table...');
    
    await queryInterface.createTable('Payments', {
      id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      shop_id: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Shops',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      payment_type: {
        type: sequelize.Sequelize.STRING(50),
        allowNull: false,
        comment: 'deposit, subscription'
      },
      plan_name: {
        type: sequelize.Sequelize.STRING(50),
        allowNull: true,
        comment: 'basic_7m, premium_12m, etc.'
      },
      amount: {
        type: sequelize.Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      payment_screenshot: {
        type: sequelize.Sequelize.TEXT('long'),
        allowNull: true,
        comment: 'Base64 encoded image'
      },
      payment_date: {
        type: sequelize.Sequelize.DATE,
        allowNull: true
      },
      verification_status: {
        type: sequelize.Sequelize.STRING(20),
        defaultValue: 'pending',
        comment: 'pending, approved, rejected'
      },
      verified_by: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: true,
        comment: 'Admin user ID'
      },
      verified_at: {
        type: sequelize.Sequelize.DATE,
        allowNull: true
      },
      transaction_id: {
        type: sequelize.Sequelize.STRING(100),
        allowNull: true
      },
      upi_ref_number: {
        type: sequelize.Sequelize.STRING(100),
        allowNull: true
      },
      notes: {
        type: sequelize.Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: sequelize.Sequelize.DATE,
        defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: sequelize.Sequelize.DATE,
        defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    console.log('✅ Payments table created');

    // 3. Create Subscription_History table
    console.log('📝 Creating Subscription_History table...');
    
    await queryInterface.createTable('Subscription_History', {
      id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      shop_id: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Shops',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      plan_type: {
        type: sequelize.Sequelize.STRING(20),
        allowNull: false,
        comment: 'trial, basic, premium'
      },
      plan_duration: {
        type: sequelize.Sequelize.STRING(20),
        allowNull: true,
        comment: '7m, 9m, 12m'
      },
      start_date: {
        type: sequelize.Sequelize.DATE,
        allowNull: false
      },
      end_date: {
        type: sequelize.Sequelize.DATE,
        allowNull: false
      },
      amount_paid: {
        type: sequelize.Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      payment_id: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Payments',
          key: 'id'
        }
      },
      status: {
        type: sequelize.Sequelize.STRING(20),
        defaultValue: 'active',
        comment: 'active, expired, cancelled'
      },
      created_at: {
        type: sequelize.Sequelize.DATE,
        defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    console.log('✅ Subscription_History table created');

    // 4. Create Admin_Settings table
    console.log('📝 Creating Admin_Settings table...');
    
    await queryInterface.createTable('Admin_Settings', {
      id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      setting_key: {
        type: sequelize.Sequelize.STRING(100),
        unique: true,
        allowNull: false
      },
      setting_value: {
        type: sequelize.Sequelize.TEXT('long'),
        allowNull: true
      },
      updated_at: {
        type: sequelize.Sequelize.DATE,
        defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    console.log('✅ Admin_Settings table created');

    // 5. Insert default admin settings
    console.log('📝 Inserting default admin settings...');
    
    await queryInterface.bulkInsert('Admin_Settings', [
      {
        setting_key: 'subscription_upi_id',
        setting_value: '8269858259@ybl'
      },
      {
        setting_key: 'subscription_qr_code',
        setting_value: null
      }
    ]);

    console.log('✅ Default settings inserted');

    console.log('🎉 Subscription system migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

export const down = async () => {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('🔄 Rolling back subscription system migration...');

    // Drop tables in reverse order
    await queryInterface.dropTable('Admin_Settings');
    await queryInterface.dropTable('Subscription_History');
    await queryInterface.dropTable('Payments');

    // Remove columns from Shops table
    const shopsTableInfo = await queryInterface.describeTable('Shops');
    
    const columnsToRemove = [
      'subscription_plan',
      'subscription_start_date',
      'subscription_end_date',
      'deposit_paid',
      'deposit_amount',
      'deposit_refunded',
      'deposit_refund_date',
      'suspension_reason'
    ];

    for (const column of columnsToRemove) {
      if (shopsTableInfo[column]) {
        await queryInterface.removeColumn('Shops', column);
      }
    }

    console.log('✅ Rollback completed');
    
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
};
