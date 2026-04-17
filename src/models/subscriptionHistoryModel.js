import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const SubscriptionHistory = sequelize.define('Subscription_History', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  shopId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  planType: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  planDuration: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  amountPaid: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  paymentId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'active'
  },
  createdAt: {
    type: DataTypes.DATE,
    field: 'created_at'
  }
}, {
  tableName: 'Subscription_History',
  timestamps: true,
  updatedAt: false
});

export default SubscriptionHistory;
