import PDFDocument from "pdfkit";
import sequelize from "../config/database.js";
import Quotation from "../models/quotationModel.js";
import QuotationItem from "../models/quotationItemModel.js";
import Product from "../models/productmodel.js";
import Shop from "../models/shopmodel.js";
import Bill from "../models/billmodel.js";
import BillItem from "../models/billItemmodel.js";
import BillPayment from "../models/billPaymentModel.js";
import { clearShopCache } from "../middlewares/cache.js";

// ─────────────────────────────────────────────
// HELPER: calculate totals from items + tax/discount
// ─────────────────────────────────────────────
function calculateTotals(items, gst_percentage, discount_type, discount_value) {
  const subtotal = items.reduce((sum, i) => sum + i.total, 0);

  let totalAmount = subtotal;
  let gstAmount = 0;
  let discountAmount = 0;

  if (gst_percentage > 0) {
    gstAmount = parseFloat(((subtotal * gst_percentage) / 100).toFixed(2));
    totalAmount = parseFloat((subtotal + gstAmount).toFixed(2));
  }

  if (discount_type && discount_value > 0) {
    if (discount_type === "percentage") {
      discountAmount = parseFloat(((totalAmount * discount_value) / 100).toFixed(2));
    } else {
      discountAmount = parseFloat(Number(discount_value).toFixed(2));
    }
    if (discountAmount > totalAmount) discountAmount = totalAmount;
    totalAmount = parseFloat((totalAmount - discountAmount).toFixed(2));
  }

  return { subtotal, gstAmount, discountAmount, totalAmount };
}

// ─────────────────────────────────────────────
// HELPER: build item list (supports product_id OR free-text)
// ─────────────────────────────────────────────
async function buildItemList(rawItems, shopId) {
  const productIds = rawItems
    .filter((i) => i.product_id)
    .map((i) => i.product_id);

  let productMap = new Map();

  if (productIds.length > 0) {
    const products = await Product.findAll({
      where: { id: productIds, shop_id: shopId },
      attributes: ["id", "product_name", "selling_price"],
    });
    productMap = new Map(products.map((p) => [p.id, p]));
  }

  const items = [];

  for (const raw of rawItems) {
    let itemName = raw.item_name || "";
    let price = parseFloat(raw.price);
    const quantity = parseFloat(raw.quantity) || 1;
    const unit = raw.unit || "pcs";
    const description = raw.description || null;

    if (raw.product_id) {
      const product = productMap.get(raw.product_id);
      if (!product) {
        throw new Error(`Product not found (ID: ${raw.product_id})`);
      }
      itemName = itemName || product.product_name;
      if (isNaN(price)) price = product.selling_price;
    }

    if (!itemName) throw new Error("item_name is required");
    if (isNaN(price) || price < 0) throw new Error(`Invalid price for item: ${itemName}`);

    items.push({
      product_id: raw.product_id || null,
      item_name: itemName,
      description,
      quantity,
      unit,
      price,
      total: parseFloat((price * quantity).toFixed(2)),
    });
  }

  return items;
}

// ────────────────────────────────────────────────
// 1. CREATE QUOTATION
// ────────────────────────────────────────────────
export const createQuotation = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      items,
      customer_id,
      customer_name,
      customer_phone,
      customer_email,
      customer_address,
      gst_percentage = 0,
      discount_type,
      discount_value = 0,
      valid_until,
      notes,
      terms_and_conditions,
    } = req.body;

    const shopId = req.user.shop_id;
    const userId = req.user.user_id;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Items are required" });
    }

    // Build items
    const builtItems = await buildItemList(items, shopId);

    // Calculate totals
    const { subtotal, gstAmount, discountAmount, totalAmount } =
      calculateTotals(builtItems, gst_percentage, discount_type, discount_value);

    // Generate quotation number
    const lastQuotation = await Quotation.findOne({
      where: { shop_id: shopId },
      order: [["id", "DESC"]],
      attributes: ["quotation_number"],
      transaction,
    });

    let nextNum = 1;
    if (lastQuotation?.quotation_number) {
      const match = lastQuotation.quotation_number.match(/\d+$/);
      if (match) nextNum = parseInt(match[0]) + 1;
    }

    const quotation_number = `QUO-${String(nextNum).padStart(4, "0")}`;

    // Create quotation
    const quotation = await Quotation.create(
      {
        quotation_number,
        customer_id: customer_id || null,
        customer_name: customer_name || null,
        customer_phone: customer_phone || null,
        customer_email: customer_email || null,
        customer_address: customer_address || null,
        subtotal_amount: subtotal,
        gst_percentage: gst_percentage || null,
        gst_amount: gstAmount > 0 ? gstAmount : null,
        discount_type: discount_type || null,
        discount_value: discount_value > 0 ? discount_value : null,
        discount_amount: discountAmount > 0 ? discountAmount : null,
        total_amount: totalAmount,
        valid_until: valid_until || null,
        notes: notes || null,
        terms_and_conditions: terms_and_conditions || null,
        status: "draft",
        created_by: userId,
        shop_id: shopId,
      },
      { transaction }
    );

    // Bulk create items
    const itemsWithId = builtItems.map((item) => ({
      ...item,
      quotation_id: quotation.id,
    }));
    await QuotationItem.bulkCreate(itemsWithId, { transaction });

    await transaction.commit();
    clearShopCache(shopId);

    res.status(201).json({
      message: "Quotation created successfully",
      quotation_id: quotation.id,
      quotation_number: quotation.quotation_number,
      total_amount: totalAmount,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Create quotation error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ────────────────────────────────────────────────
// 2. GET ALL QUOTATIONS (with filters)
// ────────────────────────────────────────────────
export const getQuotations = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const shopId = req.user.shop_id;

    const where = { shop_id: shopId };
    if (status) where.status = status;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Quotation.findAndCountAll({
      where,
      order: [["created_at", "DESC"]],
      limit: parseInt(limit),
      offset,
      attributes: [
        "id",
        "quotation_number",
        "customer_name",
        "customer_phone",
        "total_amount",
        "status",
        "valid_until",
        "created_at",
      ],
    });

    res.json({
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / parseInt(limit)),
      quotations: rows,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ────────────────────────────────────────────────
// 3. GET SINGLE QUOTATION
// ────────────────────────────────────────────────
export const getQuotationById = async (req, res) => {
  try {
    const quotation = await Quotation.findOne({
      where: { id: req.params.id, shop_id: req.user.shop_id },
      include: [
        {
          model: QuotationItem,
          as: "items",
          include: [
            {
              model: Product,
              as: "Product",
              attributes: ["id", "product_name", "selling_price"],
              required: false,
            },
          ],
        },
      ],
    });

    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    res.json(quotation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ────────────────────────────────────────────────
// 4. UPDATE QUOTATION
// ────────────────────────────────────────────────
export const updateQuotation = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const shopId = req.user.shop_id;

    const quotation = await Quotation.findOne({
      where: { id, shop_id: shopId },
      transaction,
    });

    if (!quotation) {
      await transaction.rollback();
      return res.status(404).json({ message: "Quotation not found" });
    }

    if (quotation.status === "converted") {
      await transaction.rollback();
      return res
        .status(400)
        .json({ message: "Cannot edit a converted quotation" });
    }

    const {
      items,
      customer_id,
      customer_name,
      customer_phone,
      customer_email,
      customer_address,
      gst_percentage = 0,
      discount_type,
      discount_value = 0,
      valid_until,
      notes,
      terms_and_conditions,
      status,
    } = req.body;

    // Rebuild items if provided
    if (items && items.length > 0) {
      const builtItems = await buildItemList(items, shopId);
      const { subtotal, gstAmount, discountAmount, totalAmount } =
        calculateTotals(builtItems, gst_percentage, discount_type, discount_value);

      // Delete old items
      await QuotationItem.destroy({
        where: { quotation_id: quotation.id },
        transaction,
      });

      // Create new items
      const itemsWithId = builtItems.map((item) => ({
        ...item,
        quotation_id: quotation.id,
      }));
      await QuotationItem.bulkCreate(itemsWithId, { transaction });

      await quotation.update(
        {
          customer_id: customer_id ?? quotation.customer_id,
          customer_name: customer_name ?? quotation.customer_name,
          customer_phone: customer_phone ?? quotation.customer_phone,
          customer_email: customer_email ?? quotation.customer_email,
          customer_address: customer_address ?? quotation.customer_address,
          subtotal_amount: subtotal,
          gst_percentage: gst_percentage || null,
          gst_amount: gstAmount > 0 ? gstAmount : null,
          discount_type: discount_type || null,
          discount_value: discount_value > 0 ? discount_value : null,
          discount_amount: discountAmount > 0 ? discountAmount : null,
          total_amount: totalAmount,
          valid_until: valid_until ?? quotation.valid_until,
          notes: notes ?? quotation.notes,
          terms_and_conditions:
            terms_and_conditions ?? quotation.terms_and_conditions,
          status: status ?? quotation.status,
        },
        { transaction }
      );
    } else {
      // Update metadata only
      await quotation.update(
        {
          customer_id: customer_id ?? quotation.customer_id,
          customer_name: customer_name ?? quotation.customer_name,
          customer_phone: customer_phone ?? quotation.customer_phone,
          customer_email: customer_email ?? quotation.customer_email,
          customer_address: customer_address ?? quotation.customer_address,
          valid_until: valid_until ?? quotation.valid_until,
          notes: notes ?? quotation.notes,
          terms_and_conditions:
            terms_and_conditions ?? quotation.terms_and_conditions,
          status: status ?? quotation.status,
        },
        { transaction }
      );
    }

    await transaction.commit();
    clearShopCache(shopId);

    res.json({ message: "Quotation updated successfully" });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
};

// ────────────────────────────────────────────────
// 5. DELETE QUOTATION
// ────────────────────────────────────────────────
export const deleteQuotation = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const quotation = await Quotation.findOne({
      where: { id: req.params.id, shop_id: req.user.shop_id },
      transaction,
    });

    if (!quotation) {
      await transaction.rollback();
      return res.status(404).json({ message: "Quotation not found" });
    }

    if (quotation.status === "converted") {
      await transaction.rollback();
      return res
        .status(400)
        .json({ message: "Cannot delete a converted quotation" });
    }

    await QuotationItem.destroy({
      where: { quotation_id: quotation.id },
      transaction,
    });
    await quotation.destroy({ transaction });

    await transaction.commit();
    clearShopCache(req.user.shop_id);

    res.json({ message: "Quotation deleted successfully" });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
};

// ────────────────────────────────────────────────
// 6. UPDATE STATUS (draft → sent → accepted / rejected)
// ────────────────────────────────────────────────
export const updateQuotationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ["draft", "sent", "accepted", "rejected", "expired"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Allowed: ${allowedStatuses.join(", ")}` });
    }

    const quotation = await Quotation.findOne({
      where: { id: req.params.id, shop_id: req.user.shop_id },
    });

    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    if (quotation.status === "converted") {
      return res.status(400).json({ message: "Cannot change status of a converted quotation" });
    }

    await quotation.update({ status });
    clearShopCache(req.user.shop_id);

    res.json({ message: `Quotation marked as ${status}`, quotation_id: quotation.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ────────────────────────────────────────────────
// 7. CONVERT QUOTATION TO BILL
// ────────────────────────────────────────────────
export const convertToBill = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { payments } = req.body;
    const shopId = req.user.shop_id;
    const userId = req.user.user_id;

    if (!payments || payments.length === 0) {
      return res.status(400).json({ message: "Payment details required to convert to bill" });
    }

    const quotation = await Quotation.findOne({
      where: { id, shop_id: shopId },
      include: [{ model: QuotationItem, as: "items" }],
      transaction,
    });

    if (!quotation) {
      await transaction.rollback();
      return res.status(404).json({ message: "Quotation not found" });
    }

    if (quotation.status === "converted") {
      await transaction.rollback();
      return res.status(400).json({ message: "Quotation already converted to a bill" });
    }

    // Validate stock for all product-linked items
    const productItems = quotation.items.filter((i) => i.product_id);
    if (productItems.length > 0) {
      const productIds = productItems.map((i) => i.product_id);
      const products = await Product.findAll({
        where: { id: productIds, shop_id: shopId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      for (const item of productItems) {
        const product = productMap.get(item.product_id);
        if (!product || parseFloat(product.stock_quantity) < item.quantity) {
          await transaction.rollback();
          return res.status(400).json({
            message: `Insufficient stock for: ${item.item_name}`,
          });
        }
      }

      // Deduct stock
      for (const item of productItems) {
        const product = productMap.get(item.product_id);
        await Product.update(
          { stock_quantity: parseFloat(product.stock_quantity) - item.quantity },
          { where: { id: product.id }, transaction }
        );
      }
    }

    // Get next bill number
    const lastBill = await Bill.findOne({
      where: { shop_id: shopId },
      order: [["id", "DESC"]],
      attributes: ["bill_number"],
      transaction,
    });

    let nextBillNum = 1;
    if (lastBill?.bill_number) {
      const match = lastBill.bill_number.match(/\d+$/);
      if (match) nextBillNum = parseInt(match[0]) + 1;
    }

    // Create Bill
    const bill = await Bill.create(
      {
        bill_number: nextBillNum.toString(),
        subtotal_amount: quotation.subtotal_amount,
        gst_percentage: quotation.gst_percentage,
        gst_amount: quotation.gst_amount,
        discount_percentage: quotation.discount_value,
        discount_amount: quotation.discount_amount,
        total_amount: quotation.total_amount,
        customer_id: quotation.customer_id,
        customer_name: quotation.customer_name,
        customer_phone: quotation.customer_phone,
        status: "PAID",
        created_by: userId,
        shop_id: shopId,
      },
      { transaction }
    );

    // Create BillItems from quotation items
    const billItemsToCreate = quotation.items.map((item) => ({
      bill_id: bill.id,
      product_id: item.product_id || null,
      quantity: item.quantity,
      price: item.price,
    }));
    await BillItem.bulkCreate(billItemsToCreate, { transaction });

    // Handle payments
    let paidAmount = 0;
    const paymentsToCreate = payments.map((pay) => {
      const amount = parseFloat(pay.amount) || 0;
      if (pay.mode !== "credit") paidAmount += amount;
      return {
        bill_id: bill.id,
        amount,
        payment_mode: pay.mode,
        reference_id: pay.reference_id || null,
      };
    });
    await BillPayment.bulkCreate(paymentsToCreate, { transaction });

    const dueAmount = Math.max(0, quotation.total_amount - paidAmount);
    await bill.update(
      {
        paid_amount: paidAmount,
        due_amount: dueAmount,
        status: dueAmount === 0 ? "PAID" : paidAmount === 0 ? "UNPAID" : "PARTIAL",
      },
      { transaction }
    );

    // Mark quotation as converted
    await quotation.update(
      { status: "converted", converted_bill_id: bill.id },
      { transaction }
    );

    await transaction.commit();
    clearShopCache(shopId);

    res.json({
      message: "Quotation converted to bill successfully",
      bill_id: bill.id,
      bill_number: bill.bill_number,
      total_amount: quotation.total_amount,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Convert quotation error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ────────────────────────────────────────────────
// 8. GENERATE PROFESSIONAL PDF
// ────────────────────────────────────────────────
export const generateQuotationPDF = async (req, res) => {
  try {
    const shopId = req.user.shop_id;

    const quotation = await Quotation.findOne({
      where: { id: req.params.id, shop_id: shopId },
      include: [{ model: QuotationItem, as: "items" }],
    });
    if (!quotation) return res.status(404).json({ message: "Quotation not found" });

    const shop = await Shop.findByPk(shopId, {
      attributes: [
        "shop_name","category","address","owner_phone","gstin","pan",
        "upi_id","upi_name","bank_name","bank_branch","bank_account_number",
        "bank_ifsc","authorized_signatory","signature_image","terms_and_conditions",
      ],
    });

    // ── Document setup ──────────────────────────────────────────────────────
    const M  = 40;           // margin
    const doc = new PDFDocument({ margin: M, size: "A4", bufferPages: true });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=quotation-${quotation.quotation_number}.pdf`);
    doc.pipe(res);

    const PW   = doc.page.width;          // 595
    const PH   = doc.page.height;         // 842
    const CW   = PW - M * 2;             // content width = 515
    const BLUE = "#1e3a8a";
    const LBLUE= "#2563eb";
    const BGBL = "#f0f4ff";
    const BGGY = "#f8fafc";
    const BORD = "#d1d8e8";
    const DARK = "#1e293b";
    const GREY = "#64748b";
    const WHITE= "#ffffff";

    const rupee = (n) => `Rs.${Number(n || 0).toFixed(2)}`;
    let Y = M; // current Y cursor

    // ── Helper: draw horizontal rule ─────────────────────────────────────────
    const hRule = (y, color = BORD, w = 0.5) => {
      doc.moveTo(M, y).lineTo(M + CW, y).lineWidth(w).strokeColor(color).stroke();
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 1. SHOP HEADER  (dark blue band, full width)
    // ─────────────────────────────────────────────────────────────────────────
    const HDR_H = 90;
    doc.rect(0, 0, PW, HDR_H).fill(BLUE);

    // Shop name
    doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(22)
       .text(shop.shop_name.toUpperCase(), M, 18, { width: CW * 0.65 });

    // Category / address / phone
    let shopInfoY = 46;
    if (shop.category) {
      doc.font("Helvetica").fontSize(9).fillColor("#93c5fd")
         .text(shop.category, M, shopInfoY, { width: CW * 0.65 });
      shopInfoY += 13;
    }
    const addrParts = [];
    if (shop.address)     addrParts.push(shop.address);
    if (shop.owner_phone) addrParts.push(`Ph: ${shop.owner_phone}`);
    if (addrParts.length) {
      doc.font("Helvetica").fontSize(8).fillColor("#bfdbfe")
         .text(addrParts.join("  |  "), M, shopInfoY, { width: CW * 0.65 });
      shopInfoY += 13;
    }
    if (shop.gstin) {
      doc.fontSize(8).fillColor("#bfdbfe")
         .text(`GSTIN: ${shop.gstin}`, M, shopInfoY, { width: CW * 0.65 });
    }

    // "QUOTATION" label — right column of header
    const qLabelX = M + CW * 0.65 + 10;
    const qLabelW = CW * 0.35;
    doc.font("Helvetica-Bold").fontSize(26).fillColor(WHITE)
       .text("QUOTATION", qLabelX, 14, { width: qLabelW, align: "right" });

    Y = HDR_H;

    // ─────────────────────────────────────────────────────────────────────────
    // 2. BLUE TITLE BAR  "QUOTATION – QUO-0001"
    // ─────────────────────────────────────────────────────────────────────────
    const TBAR_H = 22;
    doc.rect(0, Y, PW, TBAR_H).fill(LBLUE);
    doc.font("Helvetica-Bold").fontSize(10).fillColor(WHITE)
       .text(
         `QUOTATION  –  ${quotation.quotation_number}`,
         M, Y + 6,
         { width: CW, align: "center" }
       );
    Y += TBAR_H + 10;

    // ─────────────────────────────────────────────────────────────────────────
    // 3. INFO BOXES  (two boxes side by side)
    // ─────────────────────────────────────────────────────────────────────────
    const BOX_H   = 72;
    const BOX_GAP = 10;
    const BOX_W   = (CW - BOX_GAP) / 2;

    // Left box — Quotation meta
    doc.rect(M, Y, BOX_W, BOX_H).fill(BGBL).stroke();
    doc.rect(M, Y, BOX_W, BOX_H).lineWidth(0.5).strokeColor(BORD).stroke();
    let lY = Y + 8;
    const metaLine = (label, val) => {
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(DARK)
         .text(`${label} `, M + 8, lY, { continued: true, width: BOX_W - 16 });
      doc.font("Helvetica").fillColor(GREY).text(val || "-");
      lY += 13;
    };
    metaLine("Quotation No:", quotation.quotation_number);
    metaLine("Date:", new Date(quotation.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "numeric", year: "numeric" }));
    if (quotation.valid_until) metaLine("Valid Until:", new Date(quotation.valid_until).toLocaleDateString("en-IN", { day: "numeric", month: "numeric", year: "numeric" }));
    metaLine("Status:", quotation.status.toUpperCase());

    // Right box — Customer / Bill To
    const RX = M + BOX_W + BOX_GAP;
    doc.rect(RX, Y, BOX_W, BOX_H).fill(BGBL);
    doc.rect(RX, Y, BOX_W, BOX_H).lineWidth(0.5).strokeColor(BORD).stroke();
    let rY = Y + 8;
    const custLine = (label, val) => {
      if (!val) return;
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(DARK)
         .text(`${label} `, RX + 8, rY, { continued: true, width: BOX_W - 16 });
      doc.font("Helvetica").fillColor(GREY).text(val);
      rY += 13;
    };
    custLine("To:", quotation.customer_name || "-");
    custLine("Mobile:", quotation.customer_phone);
    custLine("Email:", quotation.customer_email);
    custLine("Address:", quotation.customer_address);

    Y += BOX_H + 14;

    // ─────────────────────────────────────────────────────────────────────────
    // 4. ITEMS TABLE
    // ─────────────────────────────────────────────────────────────────────────
    // Column definitions (x = absolute, w = width)
    const colDefs = [
      { key: "sno",  hdr: "#",           x: M,                    w: 22,   align: "left"  },
      { key: "desc", hdr: "DESCRIPTION", x: M + 22,               w: 198,  align: "left"  },
      { key: "qty",  hdr: "QTY",         x: M + 220,              w: 60,   align: "center"},
      { key: "rate", hdr: "RATE",        x: M + 280,              w: 65,   align: "right" },
      { key: "gst",  hdr: "GST%",        x: M + 345,              w: 48,   align: "center"},
      { key: "amt",  hdr: "AMOUNT",      x: M + 393,              w: CW - 393 + M, align: "right" },
    ];
    // Adjust last column width to exactly reach right margin
    colDefs[5].w = (M + CW) - colDefs[5].x;

    // Table header row
    const TH_H = 22;
    doc.rect(M, Y, CW, TH_H).fill(BLUE);
    colDefs.forEach(col => {
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(WHITE)
         .text(col.hdr, col.x + 4, Y + 7, { width: col.w - 8, align: col.align });
    });
    Y += TH_H;

    // Table rows
    doc.lineWidth(0.4);
    quotation.items.forEach((item, idx) => {
      const rowH = 20;
      const rowBg = idx % 2 === 0 ? WHITE : BGGY;
      doc.rect(M, Y, CW, rowH).fill(rowBg);

      // Bottom border for each row
      doc.moveTo(M, Y + rowH).lineTo(M + CW, Y + rowH)
         .strokeColor(BORD).lineWidth(0.3).stroke();

      const vals = {
        sno:  String(idx + 1),
        desc: item.item_name,
        qty:  `${item.quantity} ${item.unit || "pcs"}`,
        rate: rupee(item.price),
        gst:  quotation.gst_percentage ? `${quotation.gst_percentage}%` : "0%",
        amt:  rupee(item.total),
      };

      colDefs.forEach(col => {
        const isDesc = col.key === "desc";
        doc.font(isDesc ? "Helvetica-Bold" : "Helvetica")
           .fontSize(8.5).fillColor(DARK)
           .text(vals[col.key] || "", col.x + 4, Y + 6, { width: col.w - 8, align: col.align });
      });
      Y += rowH;
    });

    // Outer table border
    doc.rect(M, Y - (quotation.items.length * 20) - TH_H, CW, TH_H + quotation.items.length * 20)
       .lineWidth(0.5).strokeColor(BORD).stroke();

    Y += 10;

    // ─────────────────────────────────────────────────────────────────────────
    // 5. TOTALS (right-aligned block)
    // ─────────────────────────────────────────────────────────────────────────
    const TW = 220;   // totals block width
    const TX = M + CW - TW;
    const TR_H = 18;

    const totalRow = (label, val, isBold = false, isFinal = false) => {
      if (isFinal) {
        doc.rect(TX, Y, TW, TR_H + 2).fill(BLUE);
        doc.font("Helvetica-Bold").fontSize(10).fillColor(WHITE)
           .text(label, TX + 8, Y + 5, { width: TW * 0.55, align: "left" });
        doc.text(val, TX + TW * 0.55, Y + 5, { width: TW * 0.42, align: "right" });
        Y += TR_H + 2;
      } else {
        doc.font(isBold ? "Helvetica-Bold" : "Helvetica")
           .fontSize(9)
           .fillColor(isBold ? DARK : GREY)
           .text(label, TX + 8, Y + 4, { width: TW * 0.55, align: "left" });
        doc.text(val, TX + TW * 0.55, Y + 4, { width: TW * 0.42, align: "right" });
        // border
        doc.rect(TX, Y, TW, TR_H).lineWidth(0.4).strokeColor(BORD).stroke();
        Y += TR_H;
      }
    };

    totalRow("Subtotal", rupee(quotation.subtotal_amount));
    if (quotation.gst_percentage > 0)
      totalRow(`GST Amount (${quotation.gst_percentage}%)`, rupee(quotation.gst_amount));
    if (quotation.discount_amount > 0)
      totalRow(
        `Discount${quotation.discount_type === "percentage" ? ` (${quotation.discount_value}%)` : ""}`,
        `-${rupee(quotation.discount_amount)}`
      );
    totalRow("GRAND TOTAL", rupee(quotation.total_amount), true, true);

    Y += 18;

    // ─────────────────────────────────────────────────────────────────────────
    // 6. TERMS & CONDITIONS
    // ─────────────────────────────────────────────────────────────────────────
    const effectiveTerms = quotation.terms_and_conditions || shop.terms_and_conditions;
    const hasNotes = !!quotation.notes;

    if (hasNotes || effectiveTerms) {
      const SEC_W = hasNotes && effectiveTerms ? (CW - 10) / 2 : CW;
      const SEC_X2 = M + SEC_W + 10;

      const drawSection = (title, text, sx, sw) => {
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor(LBLUE)
           .text(`${title}:`, sx, Y);
        doc.moveDown(0.2);
        doc.font("Helvetica").fontSize(8).fillColor(GREY)
           .text(text, sx, Y + 14, { width: sw, lineGap: 2 });
      };

      if (hasNotes)      drawSection("Notes", quotation.notes, M, SEC_W);
      if (effectiveTerms) drawSection("Terms & Conditions", effectiveTerms, hasNotes ? SEC_X2 : M, SEC_W);
      Y += 60;
    }

    hRule(Y);
    Y += 10;

    // ─────────────────────────────────────────────────────────────────────────
    // 7. PAYMENT DETAILS + SIGNATURE  (two columns)
    // ─────────────────────────────────────────────────────────────────────────
    const hasBankInfo = shop.bank_name || shop.bank_account_number || shop.upi_id;
    const PAY_W = hasBankInfo ? (CW - 10) / 2 : 0;
    const SIG_X = hasBankInfo ? M + PAY_W + 10 : M;
    const SIG_W = hasBankInfo ? CW - PAY_W - 10 : CW;

    if (hasBankInfo) {
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(LBLUE).text("Payment Details:", M, Y);
      let bY = Y + 14;
      const bLine = (label, val) => {
        if (!val) return;
        doc.font("Helvetica").fontSize(8).fillColor(DARK)
           .text(`${label}: `, M, bY, { continued: true });
        doc.fillColor(GREY).text(val);
        bY += 12;
      };
      bLine("Bank",    shop.bank_name);
      bLine("Branch",  shop.bank_branch);
      bLine("A/C No",  shop.bank_account_number);
      bLine("IFSC",    shop.bank_ifsc);
      if (shop.upi_id)
        bLine("UPI", `${shop.upi_id}${shop.upi_name ? ` (${shop.upi_name})` : ""}`);
    }

    // Signature block
    const sigBlockTop = Y;
    doc.font("Helvetica").fontSize(8.5).fillColor(GREY)
       .text("Authorised Signatory", SIG_X, sigBlockTop, { width: SIG_W, align: "center" });

    // Signature image
    if (shop.signature_image) {
      try {
        const imgBuf = Buffer.from(
          shop.signature_image.replace(/^data:image\/\w+;base64,/, ""),
          "base64"
        );
        doc.image(imgBuf, SIG_X + SIG_W / 2 - 35, sigBlockTop + 12, { fit: [70, 35] });
      } catch (_) { /* skip */ }
    }

    // Signatory name + line
    const sigLineY = sigBlockTop + 55;
    doc.moveTo(SIG_X + 10, sigLineY).lineTo(SIG_X + SIG_W - 10, sigLineY)
       .lineWidth(0.5).strokeColor(BORD).stroke();
    const sigName = shop.authorized_signatory || shop.shop_name;
    doc.font("Helvetica-Bold").fontSize(9).fillColor(DARK)
       .text(sigName, SIG_X, sigLineY + 4, { width: SIG_W, align: "center" });

    // ─────────────────────────────────────────────────────────────────────────
    // 8. FOOTER NOTE
    // ─────────────────────────────────────────────────────────────────────────
    const footerY = PH - 30;
    hRule(footerY - 6);
    doc.font("Helvetica").fontSize(7).fillColor(GREY)
       .text(
         `This is a computer-generated quotation. For queries contact: ${shop.owner_phone || shop.shop_name}`,
         M, footerY,
         { width: CW, align: "center" }
       );

    doc.end();
  } catch (error) {
    console.error("Quotation PDF error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ────────────────────────────────────────────────
// 9. QUOTATION STATS
// ────────────────────────────────────────────────
export const getQuotationStats = async (req, res) => {
  try {
    const shopId = req.user.shop_id;

    const stats = await Quotation.findAll({
      where: { shop_id: shopId },
      attributes: [
        "status",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        [sequelize.fn("SUM", sequelize.col("total_amount")), "value"],
      ],
      group: ["status"],
      raw: true,
    });

    const result = {
      total: 0,
      draft: 0,
      sent: 0,
      accepted: 0,
      rejected: 0,
      expired: 0,
      converted: 0,
      total_value: 0,
    };

    stats.forEach((s) => {
      const count = parseInt(s.count) || 0;
      result.total += count;
      result[s.status] = count;
      result.total_value += parseFloat(s.value) || 0;
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
