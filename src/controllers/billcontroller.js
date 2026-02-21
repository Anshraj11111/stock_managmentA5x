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
import Customer from "../models/customerModel.js";
import CustomerLedger from "../models/customerLedgerModel.js";
import { clearShopCache } from "../middlewares/cache.js";
import { Op } from "sequelize";

/**
 * ======================================
 * 1️⃣ PREVIEW BILL (NO DB CHANGE)
 * ======================================
 */
export const previewBill = async (req, res) => {
  try {
    const { items, gst_percentage, discount_type, discount_value } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Items are required" });
    }

    // ✅ Validate GST percentage if provided
    if (gst_percentage !== undefined && gst_percentage !== null) {
      if (gst_percentage < 0 || gst_percentage > 28) {
        return res.status(400).json({ message: "GST percentage must be between 0 and 28" });
      }
    }

    // ✅ Validate discount if provided
    if (discount_type && discount_value) {
      if (discount_type === 'percentage' && (discount_value < 0 || discount_value > 100)) {
        return res.status(400).json({ message: "Discount percentage must be between 0 and 100" });
      }
      if (discount_type === 'fixed' && discount_value < 0) {
        return res.status(400).json({ message: "Discount amount cannot be negative" });
      }
    }

    // ✅ FIX N+1: Batch fetch all products at once
    const productIds = items.map(i => i.product_id);
    const products = await Product.findAll({
      where: {
        id: productIds,
        shop_id: req.user.shop_id,
      },
      attributes: ['id', 'product_name', 'selling_price', 'stock_quantity']
    });

    // Create a map for O(1) lookup
    const productMap = new Map(products.map(p => [p.id, p]));

    let subtotal = 0;
    const billItems = [];

    for (const item of items) {
      const product = productMap.get(item.product_id);

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
      subtotal += itemTotal;

      billItems.push({
        product_id: product.id,
        name: product.product_name,
        price: product.selling_price,
        quantity: item.quantity,
        total: itemTotal,
      });
    }

    // ✅ Calculate GST if provided
    let gstAmount = 0;
    let totalAmount = subtotal;

    if (gst_percentage !== undefined && gst_percentage !== null && gst_percentage > 0) {
      gstAmount = parseFloat(((subtotal * gst_percentage) / 100).toFixed(2));
      totalAmount = parseFloat((subtotal + gstAmount).toFixed(2));
    }

    // ✅ Calculate Discount if provided
    let discountAmount = 0;
    if (discount_type && discount_value && discount_value > 0) {
      const totalBeforeDiscount = totalAmount;
      
      if (discount_type === 'percentage') {
        discountAmount = parseFloat(((totalBeforeDiscount * discount_value) / 100).toFixed(2));
      } else if (discount_type === 'fixed') {
        discountAmount = parseFloat(discount_value.toFixed(2));
      }

      // Ensure discount doesn't exceed total
      if (discountAmount > totalBeforeDiscount) {
        discountAmount = totalBeforeDiscount;
      }

      totalAmount = parseFloat((totalBeforeDiscount - discountAmount).toFixed(2));
    }

    res.json({
      subtotal: subtotal,
      gst_percentage: gst_percentage || null,
      gst_amount: gstAmount > 0 ? gstAmount : null,
      discount_type: discount_type || null,
      discount_value: discount_value || null,
      discount_amount: discountAmount > 0 ? discountAmount : null,
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
    const { items, payments, customer_id, customer_name, customer_phone, gst_percentage, discount_type, discount_value } = req.body;
    const userId = req.user.user_id;
    const shopId = req.user.shop_id;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No items in bill" });
    }

    if (!payments || payments.length === 0) {
      return res.status(400).json({ message: "No payments provided" });
    }

    // ✅ Validate customer phone if provided
    if (customer_phone && !/^[0-9]{10}$/.test(customer_phone)) {
      return res.status(400).json({ message: "Phone number must be exactly 10 digits" });
    }

    // ✅ Validate GST percentage if provided
    if (gst_percentage !== undefined && gst_percentage !== null) {
      if (gst_percentage < 0 || gst_percentage > 28) {
        return res.status(400).json({ message: "GST percentage must be between 0 and 28" });
      }
    }

    // ✅ Validate discount if provided
    if (discount_type && discount_value) {
      if (discount_type === 'percentage' && (discount_value < 0 || discount_value > 100)) {
        return res.status(400).json({ message: "Discount percentage must be between 0 and 100" });
      }
      if (discount_type === 'fixed' && discount_value < 0) {
        return res.status(400).json({ message: "Discount amount cannot be negative" });
      }
    }

    // ✅ OPTIMIZATION: Batch fetch all products at once
    const productIds = items.map(i => i.product_id);
    const products = await Product.findAll({
      where: { 
        id: productIds, 
        shop_id: shopId 
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
      raw: true
    });

    // Create product map for O(1) lookup
    const productMap = new Map(products.map(p => [p.id, p]));

    // Validate all products and calculate subtotal
    let subtotal = 0;
    const billItemsToCreate = [];
    const stockUpdates = [];

    for (const item of items) {
      const product = productMap.get(item.product_id);

      if (!product || product.stock_quantity < item.quantity) {
        throw new Error(`Insufficient stock for product ID ${item.product_id}`);
      }

      const itemTotal = product.selling_price * item.quantity;
      subtotal += itemTotal;

      billItemsToCreate.push({
        product_id: product.id,
        quantity: item.quantity,
        price: product.selling_price,
      });

      stockUpdates.push({
        id: product.id,
        newStock: product.stock_quantity - item.quantity
      });
    }

    // ✅ Calculate GST if provided
    let gstAmount = 0;
    let totalAmount = subtotal;

    if (gst_percentage !== undefined && gst_percentage !== null && gst_percentage > 0) {
      gstAmount = parseFloat(((subtotal * gst_percentage) / 100).toFixed(2));
      totalAmount = parseFloat((subtotal + gstAmount).toFixed(2));
    }

    // ✅ Calculate Discount if provided
    let discountAmount = 0;
    let discountPercentage = null;

    if (discount_type && discount_value && discount_value > 0) {
      const totalBeforeDiscount = totalAmount;
      
      if (discount_type === 'percentage') {
        discountAmount = parseFloat(((totalBeforeDiscount * discount_value) / 100).toFixed(2));
        discountPercentage = discount_value;
      } else if (discount_type === 'fixed') {
        discountAmount = parseFloat(discount_value.toFixed(2));
        // Calculate equivalent percentage for storage
        discountPercentage = parseFloat(((discountAmount / totalBeforeDiscount) * 100).toFixed(2));
      }

      // Ensure discount doesn't exceed total
      if (discountAmount > totalBeforeDiscount) {
        discountAmount = totalBeforeDiscount;
      }

      totalAmount = parseFloat((totalBeforeDiscount - discountAmount).toFixed(2));
    }

    // 🧾 Create Bill with all fields
    const bill = await Bill.create(
      {
        bill_number: `BILL-${Date.now()}`,
        subtotal_amount: subtotal,
        gst_percentage: gst_percentage || null,
        gst_amount: gstAmount > 0 ? gstAmount : null,
        discount_percentage: discountPercentage,
        discount_amount: discountAmount > 0 ? discountAmount : null,
        total_amount: totalAmount,
        customer_id: customer_id || null,
        customer_name: customer_name || null,
        customer_phone: customer_phone || null,
        status: "PAID",
        created_by: userId,
        shop_id: shopId,
      },
      { transaction }
    );

    // ✅ OPTIMIZATION: Batch create bill items
    const billItemsWithBillId = billItemsToCreate.map(item => ({
      ...item,
      bill_id: bill.id
    }));
    await BillItem.bulkCreate(billItemsWithBillId, { transaction });

    // ✅ OPTIMIZATION: Batch update stock
    for (const update of stockUpdates) {
      await Product.update(
        { stock_quantity: update.newStock },
        { 
          where: { id: update.id },
          transaction 
        }
      );
    }

    // 💰 Handle Payments
    let paidAmount = 0;
    const paymentsToCreate = [];

    for (const pay of payments) {
      const amount = parseFloat(pay.amount) || 0;
      
      // ✅ Only count non-credit payments as "paid"
      if (pay.mode !== 'credit') {
        paidAmount += amount;
      }

      paymentsToCreate.push({
        bill_id: bill.id,
        amount: amount,
        payment_mode: pay.mode,
        reference_id: pay.reference_id || null,
      });
    }

    // ✅ OPTIMIZATION: Batch create payments
    await Payment.bulkCreate(paymentsToCreate, { transaction });

    // ✅ Calculate due amount (total - actually paid, excluding credit)
    const dueAmount = Math.max(0, totalAmount - paidAmount);

    await bill.update(
      {
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

    // ✅ CREDIT SYSTEM: If customer_id provided and there's due amount, create ledger entry
    if (customer_id && dueAmount > 0) {
      // Get customer
      const customer = await Customer.findOne({
        where: {
          id: customer_id,
          shop_id: shopId,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (customer) {
        // Create debit ledger entry (customer owes money)
        await CustomerLedger.create({
          shop_id: shopId,
          customer_id: customer_id,
          type: 'debit',
          amount: dueAmount,
          reference_type: 'bill',
          reference_id: bill.id,
          description: `Bill ${bill.bill_number} - Due amount`,
        }, { transaction });

        // Update customer total_due
        customer.total_due = parseFloat(customer.total_due) + parseFloat(dueAmount);
        await customer.save({ transaction });
      }
    }

    await transaction.commit();

    // Clear cache for this shop
    clearShopCache(shopId);

    res.status(201).json({
      message: "Bill created successfully",
      bill_id: bill.id,
      subtotal: subtotal,
      gst_amount: gstAmount > 0 ? gstAmount : null,
      gst_percentage: gst_percentage || null,
      discount_type: discount_type || null,
      discount_value: discount_value || null,
      discount_amount: discountAmount > 0 ? discountAmount : null,
      total_amount: totalAmount,
      customer: customer_name || customer_phone ? {
        name: customer_name,
        phone: customer_phone
      } : null,
      data: { 
        bill_id: bill.id, 
        total_amount: totalAmount,
        subtotal: subtotal,
        gst_amount: gstAmount > 0 ? gstAmount : null,
        discount_amount: discountAmount > 0 ? discountAmount : null,
      },
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
        { 
          model: BillItem,
          include: [{ 
            model: Product, 
            attributes: ['product_name', 'selling_price'] 
          }]
        },
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

    // ✅ Optimized: Single query with aggregation
    const stats = await Bill.findAll({
      where: { shop_id: shopId },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const result = {
      total: 0,
      paid: 0,
      pending: 0
    };

    stats.forEach(s => {
      const count = parseInt(s.count) || 0;
      result.total += count;
      if (s.status === 'PAID') result.paid = count;
      if (s.status === 'PARTIAL') result.pending = count;
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
