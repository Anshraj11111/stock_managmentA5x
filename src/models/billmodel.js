// import { DataTypes } from "sequelize";
// import sequelize from "../config/database.js";
// import Shop from "./shopmodel.js";

// const Bill = sequelize.define("Bill", {
//   id: {
//     type: DataTypes.INTEGER,
//     autoIncrement: true,
//     primaryKey: true,
//   },

//   total_amount: {
//     type: DataTypes.FLOAT,
//     allowNull: false,
//   },

//   payment_status: {
//     type: DataTypes.ENUM("paid", "unpaid"),
//     defaultValue: "unpaid",
//   },

  

// paid_amount: {
//   type: DataTypes.FLOAT,
//   defaultValue: 0,
// },

// due_amount: {
//   type: DataTypes.FLOAT,
//   defaultValue: 0,
// },

// status: {
//   type: DataTypes.ENUM("paid", "partial", "unpaid", "cancelled"),
//   defaultValue: "unpaid",
// },



// });

// Bill.belongsTo(Shop, { foreignKey: "shop_id" });
// Shop.hasMany(Bill, { foreignKey: "shop_id" });

// export default Bill;

import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Shop from "./shopmodel.js";

const Bill = sequelize.define("Bill", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  bill_number: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },

  total_amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },

  paid_amount: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },

  due_amount: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },

  status: {
    type: DataTypes.ENUM("PAID", "PARTIAL", "UNPAID", "CANCELLED"),
    defaultValue: "PAID",
  },

  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  shop_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  // ✅ NEW FIELDS - Professional Billing Enhancement
  customer_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    references: {
      model: 'Customers',
      key: 'id'
    }
  },

  customer_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: null,
  },

  customer_phone: {
    type: DataTypes.STRING(10),
    allowNull: true,
    defaultValue: null,
    validate: {
      is: /^[0-9]{10}$/  // Exactly 10 digits
    }
  },

  subtotal_amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },

  gst_percentage: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: null,
    validate: {
      min: 0,
      max: 28  // Max GST in India
    }
  },

  gst_amount: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: null,
  },

  discount_percentage: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: null,
    validate: {
      min: 0,
      max: 100
    }
  },

  discount_amount: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: null,
  },
});

Bill.belongsTo(Shop, { foreignKey: "shop_id" });
Shop.hasMany(Bill, { foreignKey: "shop_id" });

export default Bill;
