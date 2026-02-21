// import { DataTypes } from 'sequelize';
// import  sequelize  from '../config/database.js';

// const shop = sequelize.define('shop', {
//     id: {
//         type: DataTypes.INTEGER,
//         autoIncrement: true,
//         primaryKey: true,
//     },
//     shop_name: {
//         type: DataTypes.STRING,
//         allowNull: false,
//     },
//     category: DataTypes.STRING,
//     address: DataTypes.STRING,
    
//     trial_end_date: {
//         type: DataTypes.DATE,
//     },

//     subscription_active: {
//         type: DataTypes.BOOLEAN,
//         defaultValue: false,
//     },
//     upi_id: {
//     type: DataTypes.STRING,
//     allowNull: true,
//     },

//     upi_name: {
//     type: DataTypes.STRING,
//     allowNull: true,
//     },

// });

// export default shop;

import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Shop = sequelize.define("Shop", {

  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  shop_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  category: DataTypes.STRING,
  address: DataTypes.STRING,
  
  owner_phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  gstin: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  pan: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  // 🆓 Trial System
  trial_start_date: {
    type: DataTypes.DATE,
  },

  trial_end_date: {
    type: DataTypes.DATE,
  },

  // 💎 Subscription
  subscription_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

  plan_type: {
    type: DataTypes.STRING, // trial | monthly | halfyear | yearly
  },

  plan_expiry_date: {
    type: DataTypes.DATE,
  },

  upi_id: DataTypes.STRING,
  upi_name: DataTypes.STRING,

  // Bank Details for Invoice
  bank_name: DataTypes.STRING,
  bank_branch: DataTypes.STRING,
  bank_account_number: DataTypes.STRING,
  bank_ifsc: DataTypes.STRING,
  
  // Signature for Invoice
  authorized_signatory: DataTypes.STRING,
  signature_image: DataTypes.TEXT('long'), // Base64 encoded image (up to 4GB)
  
  // Terms and Conditions for Invoice
  terms_and_conditions: DataTypes.TEXT,

}, {
  timestamps: true,
});

export default Shop;
