import PDFDocument from "pdfkit";
import Bill from "../models/billmodel.js";
import BillItem from "../models/billItemmodel.js";
import BillPayment from "../models/billPaymentModel.js";
import Product from "../models/productmodel.js";
import Shop from "../models/shopmodel.js";

export const generateInvoice = async (req, res) => {
  try {
    const billId = req.params.id;

    // ── 1. Fetch bill with shop check ────────────────────────────────────────
    const bill = await Bill.findOne({
      where: { id: billId, shop_id: req.user.shop_id },
    });
    if (!bill) return res.status(404).json({ message: "Bill not found" });

    // ── 2. Fetch items + payments ────────────────────────────────────────────
    const items = await BillItem.findAll({
      where: { bill_id: bill.id },
      include: [{ model: Product, attributes: ["product_name", "selling_price"] }],
    });

    const payments = await BillPayment.findAll({ where: { bill_id: bill.id } });

    // ── 3. Fetch shop details ────────────────────────────────────────────────
    const shop = await Shop.findByPk(req.user.shop_id, {
      attributes: [
        "shop_name", "category", "address", "owner_phone", "gstin", "pan",
        "upi_id", "upi_name", "bank_name", "bank_branch", "bank_account_number",
        "bank_ifsc", "authorized_signatory", "signature_image", "terms_and_conditions",
      ],
    });

    // ── 4. Setup PDF ─────────────────────────────────────────────────────────
    const M   = 40;
    const doc = new PDFDocument({ margin: M, size: "A4", bufferPages: true });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=invoice-${bill.bill_number}.pdf`);
    doc.pipe(res);

    const PW   = doc.page.width;   // 595
    const PH   = doc.page.height;  // 842
    const CW   = PW - M * 2;      // 515

    // Colours
    const BLUE  = "#1e3a8a";
    const LBLUE = "#2563eb";
    const BGBL  = "#f0f4ff";
    const BGGY  = "#f8fafc";
    const BORD  = "#d1d8e8";
    const DARK  = "#1e293b";
    const GREY  = "#64748b";
    const WHITE = "#ffffff";
    const GREEN = "#15803d";
    const RED   = "#dc2626";

    const rupee = (n) => `Rs.${Number(n || 0).toFixed(2)}`;
    let Y = M;

    const hRule = (y, color = BORD, w = 0.5) => {
      doc.moveTo(M, y).lineTo(M + CW, y).lineWidth(w).strokeColor(color).stroke();
    };

    // ── 5. SHOP HEADER ───────────────────────────────────────────────────────
    const HDR_H = 90;
    doc.rect(0, 0, PW, HDR_H).fill(BLUE);

    doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(22)
       .text(shop.shop_name.toUpperCase(), M, 18, { width: CW * 0.65 });

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

    // "INVOICE" top-right
    const qLabelX = M + CW * 0.65 + 10;
    const qLabelW = CW * 0.35;
    doc.font("Helvetica-Bold").fontSize(26).fillColor(WHITE)
       .text("INVOICE", qLabelX, 14, { width: qLabelW, align: "right" });

    Y = HDR_H;

    // ── 6. TITLE BAR ─────────────────────────────────────────────────────────
    const TBAR_H = 22;
    doc.rect(0, Y, PW, TBAR_H).fill(LBLUE);
    doc.font("Helvetica-Bold").fontSize(10).fillColor(WHITE)
       .text(`INVOICE  –  #${bill.bill_number}`, M, Y + 6, { width: CW, align: "center" });
    Y += TBAR_H + 10;

    // ── 7. INFO BOXES ────────────────────────────────────────────────────────
    const BOX_H   = 72;
    const BOX_GAP = 10;
    const BOX_W   = (CW - BOX_GAP) / 2;

    // Left — Invoice meta
    doc.rect(M, Y, BOX_W, BOX_H).fill(BGBL);
    doc.rect(M, Y, BOX_W, BOX_H).lineWidth(0.5).strokeColor(BORD).stroke();
    let lY = Y + 8;
    const metaLine = (label, val) => {
      if (!val) return;
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(DARK)
         .text(`${label} `, M + 8, lY, { continued: true, width: BOX_W - 16 });
      doc.font("Helvetica").fillColor(GREY).text(val);
      lY += 13;
    };
    metaLine("Bill No:",    bill.bill_number);
    metaLine("Date:",       new Date(bill.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "numeric", year: "numeric" }));
    metaLine("Status:",     bill.status);
    metaLine("Payment:",    payments.map(p => p.payment_mode.toUpperCase()).join(", ") || "-");

    // Right — Customer
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
    custLine("Bill To:", bill.customer_name || "Walk-in Customer");
    custLine("Mobile:",  bill.customer_phone);

    Y += BOX_H + 14;

    // ── 8. ITEMS TABLE ───────────────────────────────────────────────────────
    const colDefs = [
      { key: "sno",  hdr: "#",           x: M,        w: 22,              align: "left"   },
      { key: "desc", hdr: "DESCRIPTION", x: M + 22,   w: 210,             align: "left"   },
      { key: "qty",  hdr: "QTY",         x: M + 232,  w: 55,              align: "center" },
      { key: "rate", hdr: "RATE",        x: M + 287,  w: 75,              align: "right"  },
      { key: "gst",  hdr: "GST%",        x: M + 362,  w: 48,              align: "center" },
      { key: "amt",  hdr: "AMOUNT",      x: M + 410,  w: (M + CW) - (M + 410), align: "right" },
    ];
    colDefs[5].w = (M + CW) - colDefs[5].x;

    // Header row
    const TH_H = 22;
    doc.rect(M, Y, CW, TH_H).fill(BLUE);
    colDefs.forEach(col => {
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(WHITE)
         .text(col.hdr, col.x + 4, Y + 7, { width: col.w - 8, align: col.align });
    });
    Y += TH_H;

    // Data rows
    const gstPct = bill.gst_percentage || 0;
    items.forEach((item, idx) => {
      const rowH = 20;
      const rowBg = idx % 2 === 0 ? WHITE : BGGY;
      doc.rect(M, Y, CW, rowH).fill(rowBg);
      doc.moveTo(M, Y + rowH).lineTo(M + CW, Y + rowH)
         .strokeColor(BORD).lineWidth(0.3).stroke();

      const itemTotal = item.price * item.quantity;
      const vals = {
        sno:  String(idx + 1),
        desc: item.Product?.product_name || "Item",
        qty:  String(item.quantity),
        rate: rupee(item.price),
        gst:  gstPct > 0 ? `${gstPct}%` : "0%",
        amt:  rupee(itemTotal),
      };

      colDefs.forEach(col => {
        doc.font(col.key === "desc" ? "Helvetica-Bold" : "Helvetica")
           .fontSize(8.5).fillColor(DARK)
           .text(vals[col.key] || "", col.x + 4, Y + 6, { width: col.w - 8, align: col.align });
      });
      Y += rowH;
    });

    // Table outer border
    doc.rect(M, Y - items.length * 20 - TH_H, CW, TH_H + items.length * 20)
       .lineWidth(0.5).strokeColor(BORD).stroke();

    Y += 10;

    // ── 9. TOTALS ────────────────────────────────────────────────────────────
    const TW = 220;
    const TX = M + CW - TW;
    const TR_H = 18;

    const totalRow = (label, val, isBold = false, isFinal = false, color = null) => {
      if (isFinal) {
        doc.rect(TX, Y, TW, TR_H + 2).fill(BLUE);
        doc.font("Helvetica-Bold").fontSize(10).fillColor(WHITE)
           .text(label, TX + 8, Y + 5, { width: TW * 0.55 });
        doc.text(val, TX + TW * 0.55, Y + 5, { width: TW * 0.42, align: "right" });
        Y += TR_H + 2;
      } else {
        doc.font(isBold ? "Helvetica-Bold" : "Helvetica")
           .fontSize(9)
           .fillColor(color || (isBold ? DARK : GREY))
           .text(label, TX + 8, Y + 4, { width: TW * 0.55 });
        doc.text(val, TX + TW * 0.55, Y + 4, { width: TW * 0.42, align: "right" });
        doc.rect(TX, Y, TW, TR_H).lineWidth(0.4).strokeColor(BORD).stroke();
        Y += TR_H;
      }
    };

    totalRow("Subtotal", rupee(bill.subtotal_amount || bill.total_amount));
    if (bill.gst_percentage > 0)
      totalRow(`GST Amount (${bill.gst_percentage}%)`, rupee(bill.gst_amount));
    if (bill.discount_amount > 0)
      totalRow("Discount", `-${rupee(bill.discount_amount)}`);
    totalRow("GRAND TOTAL", rupee(bill.total_amount), true, true);

    Y += 6;

    // Paid / Due summary
    if (bill.paid_amount > 0 || bill.due_amount > 0) {
      totalRow("Paid Amount", rupee(bill.paid_amount), false, false, GREEN);
      if (bill.due_amount > 0)
        totalRow("Due Amount", rupee(bill.due_amount), true, false, RED);
    }

    Y += 16;

    // ── 10. TERMS & PAYMENT ──────────────────────────────────────────────────
    const effectiveTerms = shop.terms_and_conditions;
    const hasBankInfo    = shop.bank_name || shop.bank_account_number || shop.upi_id;

    if (effectiveTerms) {
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(LBLUE).text("Terms & Conditions:", M, Y);
      Y += 14;
      doc.font("Helvetica").fontSize(8).fillColor(GREY)
         .text(effectiveTerms, M, Y, { width: CW * 0.55, lineGap: 2 });
      Y += 50;
    }

    hRule(Y);
    Y += 10;

    // ── 11. PAYMENT DETAILS + SIGNATURE ─────────────────────────────────────
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
      bLine("Bank",   shop.bank_name);
      bLine("Branch", shop.bank_branch);
      bLine("A/C No", shop.bank_account_number);
      bLine("IFSC",   shop.bank_ifsc);
      if (shop.upi_id)
        bLine("UPI", `${shop.upi_id}${shop.upi_name ? ` (${shop.upi_name})` : ""}`);
    }

    // Signature
    const sigBlockTop = Y;
    doc.font("Helvetica").fontSize(8.5).fillColor(GREY)
       .text("Authorised Signatory", SIG_X, sigBlockTop, { width: SIG_W, align: "center" });

    if (shop.signature_image) {
      try {
        const imgBuf = Buffer.from(
          shop.signature_image.replace(/^data:image\/\w+;base64,/, ""),
          "base64"
        );
        doc.image(imgBuf, SIG_X + SIG_W / 2 - 35, sigBlockTop + 12, { fit: [70, 35] });
      } catch (_) { /* skip */ }
    }

    const sigLineY = sigBlockTop + 55;
    doc.moveTo(SIG_X + 10, sigLineY).lineTo(SIG_X + SIG_W - 10, sigLineY)
       .lineWidth(0.5).strokeColor(BORD).stroke();
    const sigName = shop.authorized_signatory || shop.shop_name;
    doc.font("Helvetica-Bold").fontSize(9).fillColor(DARK)
       .text(sigName, SIG_X, sigLineY + 4, { width: SIG_W, align: "center" });

    // ── 12. FOOTER ───────────────────────────────────────────────────────────
    const footerY = PH - 30;
    hRule(footerY - 6);
    doc.font("Helvetica").fontSize(7).fillColor(GREY)
       .text(
         `This is a computer-generated invoice. For queries contact: ${shop.owner_phone || shop.shop_name}`,
         M, footerY,
         { width: CW, align: "center" }
       );

    doc.end();
  } catch (error) {
    console.error("Invoice Error:", error);
    res.status(500).json({ error: error.message });
  }
};
