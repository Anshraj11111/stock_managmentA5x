// src/models/customerModel.js

import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Shop from "./shopmodel.js";

const Customer = sequelize.define("Customer", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  shop_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Shops',
      key: 'id'
    }
  },

  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  phone: {
    type: DataTypes.STRING(15),
    allowNull: false,
  },

  address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  total_due: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    allowNull: false,
  },
}, {
  indexes: [
    { fields: ['shop_id'] },
    { fields: ['phone'] },
    { fields: ['shop_id', 'phone'], unique: true }, // Unique phone per shop
  ],
  timestamps: true,
});

// Relations
Customer.belongsTo(Shop, { foreignKey: "shop_id" });
Shop.hasMany(Customer, { foreignKey: "shop_id" });

export default Customer;
