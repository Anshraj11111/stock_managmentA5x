import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Shop from "./shopmodel.js";

const Quotation = sequelize.define("Quotation", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  quotation_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },

  // Customer details (can be ad-hoc or linked)
  customer_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    references: {
      model: "Customers",
      key: "id",
    },
  },

  customer_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: null,
  },

  customer_phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: null,
  },

  customer_email: {
    type: DataTypes.STRING(150),
    allowNull: true,
    defaultValue: null,
  },

  customer_address: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
  },

  // Amounts
  subtotal_amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },

  gst_percentage: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: null,
    validate: { min: 0, max: 28 },
  },

  gst_amount: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: null,
  },

  discount_type: {
    type: DataTypes.ENUM("percentage", "fixed"),
    allowNull: true,
    defaultValue: null,
  },

  discount_value: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: null,
  },

  discount_amount: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: null,
  },

  total_amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },

  // Quotation metadata
  status: {
    type: DataTypes.ENUM("draft", "sent", "accepted", "rejected", "expired", "converted"),
    defaultValue: "draft",
  },

  valid_until: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    defaultValue: null,
  },

  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
  },

  terms_and_conditions: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
  },

  // Converted to bill?
  converted_bill_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
  },

  // Who created it
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  shop_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  tableName: "Quotations",
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ["shop_id"] },
    { fields: ["status"] },
    { fields: ["customer_id"] },
    { fields: ["quotation_number"] },
  ],
});

// Relations
Quotation.belongsTo(Shop, { foreignKey: "shop_id" });
Shop.hasMany(Quotation, { foreignKey: "shop_id" });

export default Quotation;
