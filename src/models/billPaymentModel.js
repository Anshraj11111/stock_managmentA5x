import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Bill from './billmodel.js';

const BillPayment = sequelize.define('BillPayment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  bill_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Bills',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  payment_mode: {
    type: DataTypes.ENUM('cash', 'upi', 'card', 'credit'),
    allowNull: false,
    defaultValue: 'cash'
  },
  reference_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: null
  }
}, {
  tableName: 'BillPayments',
  timestamps: true,
  underscored: true
});

// Relations
BillPayment.belongsTo(Bill, { foreignKey: 'bill_id' });
Bill.hasMany(BillPayment, { foreignKey: 'bill_id' });

export default BillPayment;
