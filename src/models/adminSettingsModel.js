import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const AdminSettings = sequelize.define('Admin_Settings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  setting_key: {
    type: DataTypes.STRING(100),
    unique: true,
    allowNull: false
  },
  setting_value: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  }
}, {
  tableName: 'Admin_Settings',
  timestamps: true,
  createdAt: false,
  updatedAt: 'updated_at'
});

export default AdminSettings;
