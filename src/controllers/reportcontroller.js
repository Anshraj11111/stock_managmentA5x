import { Op } from "sequelize";
import sequelize from "../config/database.js";
import Bill from "../models/billmodel.js";
import Payment from "../models/paymentmodel.js";

/**
 * 📊 DAILY SALES REPORT
 * GET /api/reports/daily
 */
export const dailySalesReport = async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    // ✅ Optimized: Use aggregation with indexes
    const billStats = await Bill.findOne({
      where: {
        shop_id: req.user.shop_id,
        status: { [Op.ne]: "CANCELLED" },
        createdAt: { [Op.between]: [start, end] },
      },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_bills'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'total_sales'],
        [sequelize.fn('SUM', sequelize.col('paid_amount')), 'received_amount'],
        [sequelize.fn('SUM', sequelize.col('due_amount')), 'due_amount'],
      ],
      raw: true
    });

    // Payment mode breakup
    const paymentBreakup = await Payment.findAll({
      include: [{
        model: Bill,
        where: {
          shop_id: req.user.shop_id,
          status: { [Op.ne]: "CANCELLED" },
          createdAt: { [Op.between]: [start, end] },
        },
        attributes: []
      }],
      attributes: [
        'payment_mode',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      group: ['payment_mode'],
      raw: true
    });

    const paymentModes = {};
    paymentBreakup.forEach(p => {
      paymentModes[p.payment_mode] = parseFloat(p.total) || 0;
    });

    res.json({
      date: start.toISOString().slice(0, 10),
      total_bills: parseInt(billStats.total_bills) || 0,
      total_sales: parseFloat(billStats.total_sales) || 0,
      received_amount: parseFloat(billStats.received_amount) || 0,
      due_amount: parseFloat(billStats.due_amount) || 0,
      payment_breakup: paymentModes,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * 📊 MONTHLY SALES REPORT
 * GET /api/reports/monthly?month=2&year=2026
 */
export const monthlySalesReport = async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        message: "month and year are required",
      });
    }

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    // ✅ Optimized: Use aggregation
    const billStats = await Bill.findOne({
      where: {
        shop_id: req.user.shop_id,
        status: { [Op.ne]: "CANCELLED" },
        createdAt: { [Op.between]: [start, end] },
      },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_bills'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'total_sales'],
        [sequelize.fn('SUM', sequelize.col('paid_amount')), 'received_amount'],
        [sequelize.fn('SUM', sequelize.col('due_amount')), 'due_amount'],
      ],
      raw: true
    });

    res.json({
      month,
      year,
      total_bills: parseInt(billStats.total_bills) || 0,
      total_sales: parseFloat(billStats.total_sales) || 0,
      received_amount: parseFloat(billStats.received_amount) || 0,
      due_amount: parseFloat(billStats.due_amount) || 0,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


