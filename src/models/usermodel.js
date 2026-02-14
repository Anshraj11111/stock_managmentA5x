import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Shop from "./shopmodel.js";

const User = sequelize.define("User", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },

  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  role: {
    type: DataTypes.ENUM("owner", "staff"),
    defaultValue: "staff",
  },

  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: "is_active",
  },

  shop_id: {
  type: DataTypes.INTEGER,
  allowNull: false,
},

});

// Relations
User.belongsTo(Shop, { foreignKey: "shop_id" });
Shop.hasMany(User, { foreignKey: "shop_id" });

export default User;