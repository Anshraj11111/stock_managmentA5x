import { Op } from "sequelize";
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

    // Bills (exclude cancelled)
    const bills = await Bill.findAll({
      where: {
        shop_id: req.user.shop_id,
        status: { [Op.ne]: "cancelled" },
        createdAt: { [Op.between]: [start, end] },
      },
    });

    // Payments for those bills
    const payments = await Payment.findAll({
      include: [
        {
          model: Bill,
          where: {
            shop_id: req.user.shop_id,
            status: { [Op.ne]: "cancelled" },
          },
        },
      ],
      where: {
        createdAt: { [Op.between]: [start, end] },
      },
    });

    let totalSales = 0;
    let received = 0;
    let due = 0;

    bills.forEach((b) => {
      totalSales += b.total_amount || 0;
      received += b.paid_amount || 0;
      due += b.due_amount || 0;
    });

    // Payment mode breakup
    const paymentModes = {};
    payments.forEach((p) => {
      paymentModes[p.payment_mode] =
        (paymentModes[p.payment_mode] || 0) + p.amount;
    });

    res.json({
      date: start.toISOString().slice(0, 10),
      total_bills: bills.length,
      total_sales: totalSales,
      received_amount: received,
      due_amount: due,
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

    const bills = await Bill.findAll({
      where: {
        shop_id: req.user.shop_id,
        status: { [Op.ne]: "cancelled" },
        createdAt: { [Op.between]: [start, end] },
      },
    });

    let totalSales = 0;
    let received = 0;
    let due = 0;

    bills.forEach((b) => {
      totalSales += b.total_amount || 0;
      received += b.paid_amount || 0;
      due += b.due_amount || 0;
    });

    res.json({
      month,
      year,
      total_bills: bills.length,
      total_sales: totalSales,
      received_amount: received,
      due_amount: due,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
