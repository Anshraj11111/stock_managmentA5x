import PDFDocument from "pdfkit";
import Bill from "../models/billmodel.js";
import BillItem from "../models/billItemmodel.js";
import Product from "../models/productmodel.js";

export const generateInvoice = async (req, res) => {
  try {
    const billId = req.params.id;

    // ✅ 1. Bill fetch with SHOP CHECK
    const bill = await Bill.findOne({
      where: {
        id: billId,
        shop_id: req.user.shop_id, // 🔐 security
      },
    });

    if (!bill) {
      return res.status(404).json({
        message: "Bill not found",
      });
    }

    // ✅ 2. Fetch bill items
    const items = await BillItem.findAll({
      where: { bill_id: bill.id },
      include: [
        {
          model: Product,
          attributes: ["product_name"],
        },
      ],
    });

    // ✅ 3. Create PDF
    const doc = new PDFDocument({ margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=invoice-${bill.bill_number}.pdf`
    );

    doc.pipe(res);

    // 🧾 HEADER
    doc.fontSize(18).text("INVOICE", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Bill No: ${bill.bill_number}`);
    doc.text(`Date: ${bill.createdAt.toDateString()}`);
    doc.text(`Total Amount: ₹${bill.total_amount}`);
    doc.moveDown();

    // 📦 ITEMS
    doc.fontSize(14).text("Items:");
    doc.moveDown(0.5);

    items.forEach((item, index) => {
      doc.fontSize(12).text(
        `${index + 1}. ${item.Product.product_name}  | Qty: ${
          item.quantity
        } | Price: ₹${item.price} | Total: ₹${item.price * item.quantity}`
      );
    });

    doc.moveDown();
    doc.fontSize(14).text(`Grand Total: ₹${bill.total_amount}`, {
      align: "right",
    });

    doc.end();
  } catch (error) {
    console.error("Invoice Error:", error);
    res.status(500).json({ error: error.message });
  }
};
