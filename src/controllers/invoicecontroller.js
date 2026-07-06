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

    // Header row — drawn by drawColHeader below
    const TH_H = 22;

    // Data rows — proper page break with PDFKit
    const gstPct = bill.gst_percentage || 0;
    const ROW_H  = 22; // slightly taller rows so text doesn't wrap
    const PAGE_BOTTOM = PH - 100;

    const drawColHeader = (startY) => {
      doc.rect(M, startY, CW, TH_H).fill(BLUE);
      colDefs.forEach(col => {
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor(WHITE)
           .text(col.hdr, col.x + 4, startY + 7, { width: col.w - 8, align: col.align });
      });
      return startY + TH_H;
    };

    let tableTop = Y;
    Y = drawColHeader(Y); // draw once here only

    items.forEach((item, idx) => {
      if (Y + ROW_H > PAGE_BOTTOM) {
        // Close border on current page
        doc.rect(M, tableTop, CW, Y - tableTop).lineWidth(0.5).strokeColor(BORD).stroke();
        doc.addPage();
        Y = M;
        tableTop = Y;
        Y = drawColHeader(Y);
      }

      const rowBg = idx % 2 === 0 ? WHITE : BGGY;
      doc.rect(M, Y, CW, ROW_H).fill(rowBg);
      doc.moveTo(M, Y + ROW_H).lineTo(M + CW, Y + ROW_H)
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
      Y += ROW_H;
    });

    // Close final table border
    doc.rect(M, tableTop, CW, Y - tableTop).lineWidth(0.5).strokeColor(BORD).stroke();

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

    // Skip paid/due display in PDF - show only grand total

    Y += 16;

    // ── 10. TERMS & PAYMENT ──────────────────────────────────────────────────
    const effectiveTerms = shop?.terms_and_conditions;
    const hasBankInfo    = shop?.bank_name || shop?.bank_account_number || shop?.upi_id;

    // Ensure we have enough space for terms, if not add a new page
    const termsHeight = effectiveTerms ? 70 : 30; // Estimated height for terms section
    if (Y + termsHeight > PAGE_BOTTOM) {
      doc.addPage();
      Y = M;
    }

    if (effectiveTerms && effectiveTerms.trim()) {
      doc.font("Helvetica-Bold").fontSize(9).fillColor(LBLUE).text("Terms & Conditions:", M, Y);
      Y += 16;
      
      // Better terms formatting with proper spacing
      const termLines = effectiveTerms.split('\n').filter(line => line.trim());
      termLines.forEach(line => {
        if (line.trim()) {
          // Add bullet point and proper indentation
          doc.font("Helvetica").fontSize(8).fillColor(DARK)
             .text("•", M, Y, { width: 8 });
          doc.text(line.trim(), M + 12, Y, { width: CW * 0.55 - 12, lineGap: 1 });
          Y += 14;
        }
      });
      
      // Add some standard terms if the provided terms are too short
      if (termLines.length === 0 || (termLines.length === 1 && termLines[0].length < 30)) {
        const defaultTerms = [
          'All sales are final unless products are defective',
          'Returns accepted within 7 days with original receipt', 
          'Warranty terms as per manufacturer guidelines',
          'Prices are subject to change without notice'
        ];
        
        defaultTerms.forEach(term => {
          doc.font("Helvetica").fontSize(8).fillColor(DARK)
             .text("•", M, Y, { width: 8 });
          doc.text(term, M + 12, Y, { width: CW * 0.55 - 12 });
          Y += 14;
        });
      }
    } else {
      // Default terms if none provided
      doc.font("Helvetica-Bold").fontSize(9).fillColor(LBLUE).text("Terms & Conditions:", M, Y);
      Y += 16;
      
      const defaultTerms = [
        'Goods once sold will not be taken back',
        'All sales are final unless products are defective',
        'Returns accepted within 7 days with original receipt',
        'Subject to local jurisdiction'
      ];
      
      defaultTerms.forEach(term => {
        doc.font("Helvetica").fontSize(8).fillColor(DARK)
           .text("•", M, Y, { width: 8 });
        doc.text(term, M + 12, Y, { width: CW * 0.55 - 12 });
        Y += 14;
      });
    }

    Y += 8;

    hRule(Y);
    Y += 12;

    // ── 11. PAYMENT + SIGNATURE (right corner) ──────────────────────────────
    const iPaid = parseFloat(bill.paid_amount || 0);
    const iDue  = parseFloat(bill.due_amount  || 0);
    const paySecTopY = Y;

    // Check if we need more space for payment section
    const paymentHeight = hasBankInfo ? 100 : 60;
    if (Y + paymentHeight > PAGE_BOTTOM) {
      doc.addPage();
      Y = M;
      paySecTopY = Y;
    }

    // Left — Bank details only (no paid/due amounts)
    if (hasBankInfo) {
      doc.font("Helvetica-Bold").fontSize(9).fillColor(LBLUE).text("Payment Details:", M, Y);
      let bY = Y + 16;
      const bLine = (label, val) => {
        if (!val) return;
        doc.font("Helvetica").fontSize(8.5).fillColor(DARK)
           .text(`${label}: `, M, bY, { continued: true });
        doc.fillColor(GREY).text(val);
        bY += 14;
      };
      bLine("Bank",   shop?.bank_name);
      bLine("Branch", shop?.bank_branch);
      bLine("A/C No", shop?.bank_account_number);
      bLine("IFSC",   shop?.bank_ifsc);
      if (shop?.upi_id) bLine("UPI", `${shop.upi_id}${shop.upi_name ? ` (${shop.upi_name})` : ""}`);
    }

    // Signature box — RIGHT CORNER
    const sBoxX = M + CW - 130;
    const sBoxY = paySecTopY;
    doc.rect(sBoxX, sBoxY, 130, 65).lineWidth(0.5).strokeColor(BORD).stroke();
    doc.font("Helvetica").fontSize(8.5).fillColor(GREY)
       .text("Authorised Signatory", sBoxX, sBoxY + 8, { width: 130, align: "center" });

    if (shop?.signature_image) {
      try {
        const imgBuf = Buffer.from(
          shop.signature_image.replace(/^data:image\/\w+;base64,/, ""),
          "base64"
        );
        doc.image(imgBuf, sBoxX + 65 - 35, sBoxY + 22, { fit: [70, 30] });
      } catch (_) { /* skip */ }
    }

    doc.moveTo(sBoxX + 10, sBoxY + 52).lineTo(sBoxX + 120, sBoxY + 52)
       .lineWidth(0.5).strokeColor(BORD).stroke();
    const sigName = shop?.authorized_signatory || shop?.shop_name || 'Authorized Signatory';
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(DARK)
       .text(sigName, sBoxX, sBoxY + 55, { width: 130, align: "center" });

    // ── 12. FOOTER — on EVERY page, pinned to bottom ─────────────────────────
    doc.flushPages(); // flush buffered pages so we can iterate
    const totalInvPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalInvPages; i++) {
      doc.switchToPage(i);
      const footerY = PH - 22;
      // Blue band
      doc.rect(0, footerY, PW, 22).fill(BLUE);
      // Shop name centered
      doc.font("Helvetica-Bold").fontSize(8).fillColor(WHITE)
         .text(shop.shop_name.toUpperCase(), M, footerY + 4, { width: CW, align: "center" });
      // Tagline
      doc.font("Helvetica").fontSize(6.5).fillColor("#bfdbfe")
         .text(
           `This is a computer-generated invoice  |  ${shop.owner_phone ? 'Ph: ' + shop.owner_phone : ''}  |  Page ${i + 1} of ${totalInvPages}`,
           M, footerY + 13,
           { width: CW, align: "center" }
         );
    }

    doc.end();
  } catch (error) {
    console.error("Invoice Error:", error);
    res.status(500).json({ error: error.message });
  }
};
