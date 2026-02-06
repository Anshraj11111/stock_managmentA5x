import { DataTypes } from 'sequelize';
import  sequelize  from '../config/database.js';

const shop = sequelize.define('shop', {
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
    
    trial_end_date: {
        type: DataTypes.DATE,
    },

    subscription_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    }
});

export default shop;