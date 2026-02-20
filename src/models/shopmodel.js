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

}, {
  timestamps: true,
});

export default Shop;
