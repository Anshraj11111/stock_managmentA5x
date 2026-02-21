// src/models/customerLedgerModel.js

import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Shop from "./shopmodel.js";
import Customer from "./customerModel.js";

const CustomerLedger = sequelize.define("CustomerLedger", {
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

  customer_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Customers',
      key: 'id'
    }
  },

  type: {
    type: DataTypes.ENUM('debit', 'credit'),
    allowNull: false,
    comment: 'debit = customer owes money (bill), credit = customer paid money'
  },

  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },

  reference_type: {
    type: DataTypes.ENUM('bill', 'payment'),
    allowNull: false,
  },

  reference_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Bill ID or Payment ID'
  },

  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  indexes: [
    { fields: ['shop_id'] },
    { fields: ['customer_id'] },
    { fields: ['type'] },
    { fields: ['createdAt'] },
  ],
  timestamps: true,
});

// Relations
CustomerLedger.belongsTo(Shop, { foreignKey: "shop_id" });
CustomerLedger.belongsTo(Customer, { foreignKey: "customer_id" });
Shop.hasMany(CustomerLedger, { foreignKey: "shop_id" });
Customer.hasMany(CustomerLedger, { foreignKey: "customer_id" });

export default CustomerLedger;
