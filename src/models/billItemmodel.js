import { DataTypes } from "sequelize";
import  sequelize  from "../config/database.js";

import Bill from "./billmodel.js";
import Product from "./productmodel.js";

const BillItem = sequelize.define("BillItem", {
    quantity:{
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    price:{
        type: DataTypes.FLOAT,
        allowNull: false,
    }
}, {
  indexes: [
    { fields: ['bill_id'] },
    { fields: ['product_id'] }
  ]
});
    
BillItem.belongsTo(Bill, { foreignKey: "bill_id" });
BillItem.belongsTo(Product, { foreignKey: "product_id" });
Bill.hasMany(BillItem, { foreignKey: "bill_id" });
Product.hasMany(BillItem, { foreignKey: "product_id" });

export default BillItem;