// import sequelize from "../config/database.js";
// import Bill from "../models/billmodel.js";
// import BillItem from "../models/billItemmodel.js";
// import Product from "../models/productmodel.js";
// import Payment from "../models/paymentmodel.js";

// export const previewBill = async (req, res) => {
//   try {
//     const { items } = req.body;

//     if (!items || items.length === 0) {
//       return res.status(400).json({ message: "Items are required" });
//     }

//     let totalAmount = 0;
//     const billItems = [];

//     for (const item of items) {
//       const product = await Product.findOne({
//         where: {
//           id: item.product_id,
//           shop_id: req.user.shop_id,
//         },
//       });

//       if (!product) {
//         return res.status(404).json({
//           message: `Product not found (ID: ${item.product_id})`,
//         });
//       }

//       if (product.stock_quantity < item.quantity) {
//         return res.status(400).json({
//           message: `Insufficient stock for ${product.product_name}`,
//         });
//       }

//       const itemTotal = product.selling_price * item.quantity;
//       totalAmount += itemTotal;

//       billItems.push({
//         product_id: product.id,
//         name: product.product_name,
//         price: product.selling_price,
//         quantity: item.quantity,
//         total: itemTotal,
//       });
//     }

//     res.json({
//       total_amount: totalAmount,
//       items: billItems,
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// export const createBill = async (req, res) => {
//   const transaction = await sequelize.transaction();

//   try {
//     const { items, payments } = req.body;
//     const userId = req.user.user_id;
//     const shopId = req.user.shop_id;

//     if (!items || items.length === 0) {
//       return res.status(400).json({ message: "No items in bill" });
//     }

//     if (!payments || payments.length === 0) {
//       return res.status(400).json({ message: "Payment details required" });
//     }

//     let totalAmount = 0;

//     // 🧾 1️⃣ Create Bill
//     const bill = await Bill.create(
//       {
//         bill_number: `BILL-${Date.now()}`,
//         total_amount: 0,
//         created_by: userId,
//         shop_id: shopId,
//       },
//       { transaction }
//     );

//     // 📦 2️⃣ Process Bill Items + Stock Update
//     for (const item of items) {
//       const product = await Product.findOne({
//         where: { id: item.product_id, shop_id: shopId },
//         transaction,
//         lock: transaction.LOCK.UPDATE,
//       });

//       if (!product || product.stock_quantity < item.quantity) {
//         throw new Error(`Insufficient stock for product ID ${item.product_id}`);
//       }

//       const itemTotal = product.selling_price * item.quantity;
//       totalAmount += itemTotal;

//       await BillItem.create(
//         {
//           bill_id: bill.id,
//           product_id: product.id,
//           quantity: item.quantity,
//           price: product.selling_price,
//         },
//         { transaction }
//       );

//       await product.update(
//         {
//           stock_quantity: product.stock_quantity - item.quantity,
//         },
//         { transaction }
//       );
//     }

//     // 💰 3️⃣ Handle Multiple Payments
//     let paidAmount = 0;

//     for (const pay of payments) {
//       if (!pay.mode || !pay.amount) {
//         throw new Error("Invalid payment data");
//       }

//       paidAmount += pay.amount;

//       await Payment.create(
//         {
//           bill_id: bill.id,
//           amount: pay.amount,
//           payment_mode: pay.mode, // cash | upi | card
//           reference_id: pay.reference_id || null,
//         },
//         { transaction }
//       );
//     }

//     // ❌ Payment mismatch check
//     if (paidAmount !== totalAmount) {
//       throw new Error("Payment amount does not match bill total");
//     }

//     // 🧾 4️⃣ Update Bill Total
//     await bill.update(
//       { total_amount: totalAmount },
//       { transaction }
//     );

//     await transaction.commit();

//     res.status(201).json({
//       message: "Bill created successfully",
//       bill_id: bill.id,
//       total_amount: totalAmount,
//       payment_breakup: payments,
//     });

//   } catch (error) {
//     await transaction.rollback();
//     res.status(500).json({ error: error.message });
//   }
// };
import sequelize from "../config/database.js";
import Bill from "../models/billmodel.js";
import BillItem from "../models/billItemmodel.js";
import Product from "../models/productmodel.js";
import Payment from "../models/paymentmodel.js";

/**
 * ======================================
 * 1️⃣ PREVIEW BILL (NO DB CHANGE)
 * ======================================
 */
export const previewBill = async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Items are required" });
    }

    let totalAmount = 0;
    const billItems = [];

    for (const item of items) {
      const product = await Product.findOne({
        where: {
          id: item.product_id,
          shop_id: req.user.shop_id,
        },
      });

      if (!product) {
        return res.status(404).json({
          message: `Product not found (ID: ${item.product_id})`,
        });
      }

      if (product.stock_quantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.product_name}`,
        });
      }

      const itemTotal = product.selling_price * item.quantity;
      totalAmount += itemTotal;

      billItems.push({
        product_id: product.id,
        name: product.product_name,
        price: product.selling_price,
        quantity: item.quantity,
        total: itemTotal,
      });
    }

    res.json({
      total_amount: totalAmount,
      items: billItems,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * ======================================
 * 2️⃣ CREATE BILL (WITH PAYMENT)
 * ======================================
 */
export const createBill = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { items, payments } = req.body;
    const userId = req.user.user_id;
    const shopId = req.user.shop_id;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No items in bill" });
    }

    if (!payments || payments.length === 0) {
      return res.status(400).json({ message: "No payments provided" });
    }

    let totalAmount = 0;

    // 🧾 Create Bill
    const bill = await Bill.create(
      {
        bill_number: `BILL-${Date.now()}`,
        total_amount: 0,
        status: "PAID",
        created_by: userId,
        shop_id: shopId,
      },
      { transaction }
    );

    // 📦 Bill Items + Stock Update
    for (const item of items) {
      const product = await Product.findOne({
        where: { id: item.product_id, shop_id: shopId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!product || product.stock_quantity < item.quantity) {
        throw new Error(`Insufficient stock for product ID ${item.product_id}`);
      }

      const itemTotal = product.selling_price * item.quantity;
      totalAmount += itemTotal;

      await BillItem.create(
        {
          bill_id: bill.id,
          product_id: product.id,
          quantity: item.quantity,
          price: product.selling_price,
        },
        { transaction }
      );

      await product.update(
        {
          stock_quantity: product.stock_quantity - item.quantity,
        },
        { transaction }
      );
    }

    // 💰 Handle Payments (cash / upi / card / mixed)
    let paidAmount = 0;

    for (const pay of payments) {
      const amount = parseFloat(pay.amount) || 0;
      paidAmount += amount;

      await Payment.create(
        {
          bill_id: bill.id,
          amount: amount,
          payment_mode: pay.mode,
          reference_id: pay.reference_id || null,
        },
        { transaction }
      );
    }

    // Compare with tolerance for floating point issues
    const tolerance = 0.01;
    if (Math.abs(paidAmount - totalAmount) > tolerance) {
      throw new Error(`Payment amount (₹${paidAmount}) does not match bill total (₹${totalAmount})`);
    }

    const dueAmount = totalAmount - paidAmount;

    await bill.update(
      {
        total_amount: totalAmount,
        paid_amount: paidAmount,
        due_amount: dueAmount,
        status:
          dueAmount === 0
            ? "paid"
            : paidAmount === 0
            ? "unpaid"
            : "partial",
      },
      { transaction }
    );


    await transaction.commit();

    res.status(201).json({
      message: "Bill created successfully",
      bill_id: bill.id,
      total_amount: totalAmount,
      data: { bill_id: bill.id, total_amount: totalAmount },
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Bill creation error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * ======================================
 * 3️⃣ CANCEL BILL (STOCK ROLLBACK)
 * ======================================
 */
export const cancelBill = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    const bill = await Bill.findOne({
      where: { id, shop_id: req.user.shop_id },
      transaction,
    });

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    if (bill.status === "CANCELLED") {
      return res.status(400).json({ message: "Bill already cancelled" });
    }

    const billItems = await BillItem.findAll({
      where: { bill_id: bill.id },
      transaction,
    });

    // 🔄 Rollback stock
    for (const item of billItems) {
      const product = await Product.findByPk(item.product_id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (product) {
        await product.update(
          { stock_quantity: product.stock_quantity + item.quantity },
          { transaction }
        );
      }
    }

    await bill.update(
      { status: "CANCELLED" },
      { transaction }
    );

    await transaction.commit();

    res.json({ message: "Bill cancelled successfully" });

  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
};

/**
 * ======================================
 * 4️⃣ GET SINGLE BILL DETAILS
 * ======================================
 */
export const getBillById = async (req, res) => {
  try {
    const bill = await Bill.findOne({
      where: {
        id: req.params.id,
        shop_id: req.user.shop_id,
      },
      include: [
        { model: BillItem },
        { model: Payment },
      ],
    });

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    res.json(bill);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * ======================================
 * 5️⃣ DAILY SALES REPORT
 * ======================================
 */
export const dailySalesReport = async (req, res) => {
  try {
    const [data] = await sequelize.query(
      `
      SELECT DATE(createdAt) as date,
             SUM(total_amount) as total_sales,
             COUNT(*) as total_bills
      FROM Bills
      WHERE shop_id = ?
        AND status = 'PAID'
      GROUP BY DATE(createdAt)
      ORDER BY date DESC
      `,
      {
        replacements: [req.user.shop_id],
      }
    );

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// controllers/billcontroller.js (ADD)
export const payDue = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, mode, reference_id } = req.body;

    const bill = await Bill.findOne({
      where: { id, shop_id: req.user.shop_id },
    });
    if (!bill || bill.status === "CANCELLED") {
      return res.status(400).json({ message: "Invalid bill" });
    }

    await Payment.create({
      bill_id: bill.id,
      amount,
      payment_mode: mode,
      reference_id: reference_id || null,
    });

    bill.paid_amount += amount;
    bill.due_amount -= amount;
    bill.status = bill.due_amount <= 0 ? "PAID" : "PARTIAL";
    await bill.save();

    res.json({ message: "Due payment recorded", bill });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getRecentBills = async (req, res) => {
  try {
    const bills = await Bill.findAll({
      where: { shop_id: req.user.shop_id },
      order: [["createdAt", "DESC"]],
      limit: 10,
      attributes: [
        "id",
        "bill_number",
        "total_amount",
        "status",
        "createdAt",
      ],
    });

    res.json(bills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getBillStats = async (req, res) => {
  try {
    const shopId = req.user.shop_id;

    const total = await Bill.count({
      where: { shop_id: shopId },
    });

    const paid = await Bill.count({
      where: { shop_id: shopId, status: "PAID" },
    });

    const pending = await Bill.count({
      where: { shop_id: shopId, status: "PARTIAL" },
    });

    res.json({
      total,
      paid,
      pending,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
