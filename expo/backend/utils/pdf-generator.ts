import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from "pdf-lib";

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = A4_WIDTH - MARGIN * 2;

const COLORS = {
  black: rgb(0.067, 0.094, 0.153),
  dark: rgb(0.2, 0.2, 0.2),
  gray: rgb(0.42, 0.45, 0.49),
  lightGray: rgb(0.7, 0.7, 0.7),
  border: rgb(0.9, 0.91, 0.92),
  bgLight: rgb(0.976, 0.98, 0.984),
  white: rgb(1, 1, 1),
  green: rgb(0.063, 0.725, 0.506),
  greenDark: rgb(0.016, 0.404, 0.278),
  greenBg: rgb(0.82, 0.98, 0.898),
  blue: rgb(0.231, 0.51, 0.965),
  blueDark: rgb(0.118, 0.251, 0.686),
  blueBg: rgb(0.859, 0.918, 0.992),
  amber: rgb(0.573, 0.251, 0.055),
  amberBg: rgb(0.996, 0.953, 0.78),
};

interface ItemRow {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface PdfContext {
  page: PDFPage;
  font: PDFFont;
  fontBold: PDFFont;
  y: number;
}

const drawText = (
  ctx: PdfContext,
  text: string,
  x: number,
  options?: {
    size?: number;
    color?: ReturnType<typeof rgb>;
    bold?: boolean;
    align?: "left" | "right" | "center";
    maxWidth?: number;
  }
) => {
  const size = options?.size ?? 10;
  const color = options?.color ?? COLORS.dark;
  const usedFont = options?.bold ? ctx.fontBold : ctx.font;
  const align = options?.align ?? "left";

  let drawX = x;
  if (align === "right" && options?.maxWidth) {
    const textWidth = usedFont.widthOfTextAtSize(text, size);
    drawX = x + options.maxWidth - textWidth;
  } else if (align === "center" && options?.maxWidth) {
    const textWidth = usedFont.widthOfTextAtSize(text, size);
    drawX = x + (options.maxWidth - textWidth) / 2;
  }

  ctx.page.drawText(text, { x: drawX, y: ctx.y, size, font: usedFont, color });
};

const drawRect = (
  ctx: PdfContext,
  x: number,
  width: number,
  height: number,
  color: ReturnType<typeof rgb>
) => {
  ctx.page.drawRectangle({ x, y: ctx.y - height + 14, width, height, color });
};

const drawLine = (
  ctx: PdfContext,
  x1: number,
  x2: number,
  thickness?: number
) => {
  ctx.page.drawLine({
    start: { x: x1, y: ctx.y },
    end: { x: x2, y: ctx.y },
    thickness: thickness ?? 0.5,
    color: COLORS.border,
  });
};

const truncateText = (font: PDFFont, text: string, size: number, maxWidth: number): string => {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && font.widthOfTextAtSize(truncated + "...", size) > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + "...";
};

const drawItemsTable = (
  ctx: PdfContext,
  items: ItemRow[],
  currency: string
) => {
  const colWidths = [CONTENT_WIDTH * 0.45, CONTENT_WIDTH * 0.15, CONTENT_WIDTH * 0.2, CONTENT_WIDTH * 0.2];
  const colX = [
    MARGIN,
    MARGIN + colWidths[0],
    MARGIN + colWidths[0] + colWidths[1],
    MARGIN + colWidths[0] + colWidths[1] + colWidths[2],
  ];

  drawRect(ctx, MARGIN, CONTENT_WIDTH, 24, COLORS.bgLight);
  const headers = ["Description", "Qty", "Price", "Total"];
  const headerAligns: ("left" | "center" | "right")[] = ["left", "center", "right", "right"];
  headers.forEach((h, i) => {
    drawText(ctx, h, colX[i] + 8, {
      size: 8,
      color: COLORS.gray,
      bold: true,
      align: headerAligns[i],
      maxWidth: colWidths[i] - 16,
    });
  });

  ctx.y -= 28;

  items.forEach((item) => {
    const desc = truncateText(ctx.font, item.description, 9, colWidths[0] - 16);
    drawText(ctx, desc, colX[0] + 8, { size: 9 });
    drawText(ctx, item.quantity.toString(), colX[1] + 8, {
      size: 9,
      align: "center",
      maxWidth: colWidths[1] - 16,
    });
    drawText(ctx, `${currency}${item.unitPrice.toFixed(2)}`, colX[2] + 8, {
      size: 9,
      align: "right",
      maxWidth: colWidths[2] - 16,
    });
    drawText(ctx, `${currency}${item.total.toFixed(2)}`, colX[3] + 8, {
      size: 9,
      align: "right",
      maxWidth: colWidths[3] - 16,
    });

    ctx.y -= 6;
    drawLine(ctx, MARGIN, MARGIN + CONTENT_WIDTH);
    ctx.y -= 18;
  });

  ctx.y -= 4;
};

const drawTotals = (
  ctx: PdfContext,
  subtotal: number,
  vatAmount: number,
  vatRate: number,
  total: number,
  currency: string,
  accentColor: ReturnType<typeof rgb>,
  totalLabel: string
) => {
  const rightCol = MARGIN + CONTENT_WIDTH * 0.6;
  const rightWidth = CONTENT_WIDTH * 0.4;

  drawLine(ctx, rightCol, MARGIN + CONTENT_WIDTH, 1.5);
  ctx.y -= 18;

  drawText(ctx, "Subtotal", rightCol, { size: 9, color: COLORS.gray });
  drawText(ctx, `${currency}${subtotal.toFixed(2)}`, rightCol, {
    size: 9,
    align: "right",
    maxWidth: rightWidth,
  });
  ctx.y -= 16;

  const vatLabel = vatRate === 0 ? "VAT (Mixed)" : `VAT (${vatRate}%)`;
  drawText(ctx, vatLabel, rightCol, { size: 9, color: COLORS.gray });
  drawText(ctx, `${currency}${vatAmount.toFixed(2)}`, rightCol, {
    size: 9,
    align: "right",
    maxWidth: rightWidth,
  });
  ctx.y -= 12;

  drawLine(ctx, rightCol, MARGIN + CONTENT_WIDTH);
  ctx.y -= 20;

  drawText(ctx, totalLabel, rightCol, { size: 13, bold: true, color: COLORS.black });
  drawText(ctx, `${currency}${total.toFixed(2)}`, rightCol, {
    size: 16,
    bold: true,
    color: accentColor,
    align: "right",
    maxWidth: rightWidth,
  });
  ctx.y -= 20;
};

const drawBusinessAndClient = (
  ctx: PdfContext,
  business: { name: string; email: string; address: string; phone?: string; vatNumber?: string },
  client: { name: string; email: string },
  clientLabel: string
) => {
  const leftCol = MARGIN;
  const rightCol = MARGIN + CONTENT_WIDTH * 0.6;

  drawText(ctx, "FROM", leftCol, { size: 7, color: COLORS.lightGray, bold: true });
  drawText(ctx, clientLabel.toUpperCase(), rightCol, { size: 7, color: COLORS.lightGray, bold: true });
  ctx.y -= 16;

  drawText(ctx, business.name, leftCol, { size: 11, bold: true, color: COLORS.black });
  drawText(ctx, client.name, rightCol, { size: 11, bold: true, color: COLORS.black });
  ctx.y -= 14;

  const addressLines = business.address.split("\n").filter(Boolean);
  for (const line of addressLines) {
    drawText(ctx, line, leftCol, { size: 9, color: COLORS.gray });
    ctx.y -= 13;
  }

  drawText(ctx, client.email, rightCol, { size: 9, color: COLORS.gray });
  ctx.y -= 13;

  if (business.phone) {
    drawText(ctx, business.phone, leftCol, { size: 9, color: COLORS.gray });
    ctx.y -= 13;
  }

  drawText(ctx, business.email, leftCol, { size: 9, color: COLORS.gray });
  ctx.y -= 13;

  if (business.vatNumber) {
    drawText(ctx, `VAT: ${business.vatNumber}`, leftCol, { size: 9, color: COLORS.gray });
    ctx.y -= 13;
  }

  ctx.y -= 12;
};

const drawDateRow = (
  ctx: PdfContext,
  leftLabel: string,
  leftValue: string,
  rightLabel: string,
  rightValue: string
) => {
  const rightCol = MARGIN + CONTENT_WIDTH * 0.6;

  drawRect(ctx, MARGIN, CONTENT_WIDTH, 40, COLORS.bgLight);
  ctx.y -= 2;

  drawText(ctx, leftLabel, MARGIN + 12, { size: 7, color: COLORS.gray });
  drawText(ctx, rightLabel, rightCol + 12, { size: 7, color: COLORS.gray });
  ctx.y -= 14;

  drawText(ctx, leftValue, MARGIN + 12, { size: 10, bold: true, color: COLORS.black });
  drawText(ctx, rightValue, rightCol + 12, { size: 10, bold: true, color: COLORS.black });
  ctx.y -= 26;
};

const drawNotes = (
  ctx: PdfContext,
  notes: string,
  bgColor: ReturnType<typeof rgb>,
  textColor: ReturnType<typeof rgb>,
  labelColor: ReturnType<typeof rgb>
) => {
  const lineHeight = 13;
  const maxLineWidth = CONTENT_WIDTH - 24;
  const words = notes.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.font.widthOfTextAtSize(testLine, 9) > maxLineWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  const boxHeight = 30 + lines.length * lineHeight;
  drawRect(ctx, MARGIN, CONTENT_WIDTH, boxHeight, bgColor);
  ctx.y -= 2;

  drawText(ctx, "NOTES", MARGIN + 12, { size: 7, color: labelColor, bold: true });
  ctx.y -= 14;

  for (const line of lines) {
    drawText(ctx, line, MARGIN + 12, { size: 9, color: textColor });
    ctx.y -= lineHeight;
  }
  ctx.y -= 10;
};

const drawFooter = (ctx: PdfContext, message: string) => {
  ctx.y -= 10;
  drawText(ctx, message, MARGIN, {
    size: 9,
    color: COLORS.lightGray,
    align: "center",
    maxWidth: CONTENT_WIDTH,
  });
};

export interface InvoicePdfData {
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  items: ItemRow[];
  subtotal: number;
  vatAmount: number;
  total: number;
  vatRate: number;
  issueDate: string;
  dueDate: string;
  notes?: string;
  businessName: string;
  businessEmail: string;
  businessAddress: string;
  businessPhone?: string;
  vatNumber?: string;
}

export const generateInvoicePdf = async (data: InvoicePdfData): Promise<Uint8Array> => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([A4_WIDTH, A4_HEIGHT]);

  const ctx: PdfContext = { page, font, fontBold, y: A4_HEIGHT - MARGIN };

  drawText(ctx, "INVOICE", MARGIN, {
    size: 28,
    bold: true,
    color: COLORS.green,
    align: "center",
    maxWidth: CONTENT_WIDTH,
  });
  ctx.y -= 18;
  drawText(ctx, `#${data.invoiceNumber}`, MARGIN, {
    size: 11,
    color: COLORS.gray,
    align: "center",
    maxWidth: CONTENT_WIDTH,
  });
  ctx.y -= 30;

  drawBusinessAndClient(
    ctx,
    {
      name: data.businessName,
      email: data.businessEmail,
      address: data.businessAddress,
      phone: data.businessPhone,
      vatNumber: data.vatNumber,
    },
    { name: data.clientName, email: data.clientEmail },
    "Bill To"
  );

  drawDateRow(ctx, "Issue Date", data.issueDate, "Due Date", data.dueDate);
  ctx.y -= 16;

  drawItemsTable(ctx, data.items, "\u00A3");
  drawTotals(ctx, data.subtotal, data.vatAmount, data.vatRate, data.total, "\u00A3", COLORS.green, "Total Due");

  if (data.notes) {
    drawNotes(ctx, data.notes, COLORS.amberBg, COLORS.amber, COLORS.amber);
  }

  drawFooter(ctx, "Thank you for your business!");

  return doc.save();
};

export interface QuotePdfData {
  quoteNumber: string;
  clientName: string;
  clientEmail: string;
  items: ItemRow[];
  subtotal: number;
  vatAmount: number;
  total: number;
  vatRate: number;
  issueDate: string;
  validUntil: string;
  notes?: string;
  businessName: string;
  businessEmail: string;
  businessAddress: string;
  businessPhone?: string;
  vatNumber?: string;
}

export const generateQuotePdf = async (data: QuotePdfData): Promise<Uint8Array> => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([A4_WIDTH, A4_HEIGHT]);

  const ctx: PdfContext = { page, font, fontBold, y: A4_HEIGHT - MARGIN };

  drawText(ctx, "QUOTE", MARGIN, {
    size: 28,
    bold: true,
    color: COLORS.blue,
    align: "center",
    maxWidth: CONTENT_WIDTH,
  });
  ctx.y -= 18;
  drawText(ctx, `#${data.quoteNumber}`, MARGIN, {
    size: 11,
    color: COLORS.gray,
    align: "center",
    maxWidth: CONTENT_WIDTH,
  });
  ctx.y -= 30;

  drawBusinessAndClient(
    ctx,
    {
      name: data.businessName,
      email: data.businessEmail,
      address: data.businessAddress,
      phone: data.businessPhone,
      vatNumber: data.vatNumber,
    },
    { name: data.clientName, email: data.clientEmail },
    "Quote For"
  );

  drawDateRow(ctx, "Issue Date", data.issueDate, "Valid Until", data.validUntil);
  ctx.y -= 16;

  drawItemsTable(ctx, data.items, "\u00A3");
  drawTotals(ctx, data.subtotal, data.vatAmount, data.vatRate, data.total, "\u00A3", COLORS.blue, "Total");

  if (data.notes) {
    drawNotes(ctx, data.notes, COLORS.blueBg, COLORS.blueDark, COLORS.blueDark);
  }

  ctx.y -= 6;
  drawRect(ctx, MARGIN, CONTENT_WIDTH, 30, COLORS.amberBg);
  ctx.y -= 4;
  drawText(ctx, `This quote is valid until ${data.validUntil}`, MARGIN, {
    size: 9,
    color: COLORS.amber,
    align: "center",
    maxWidth: CONTENT_WIDTH,
    bold: true,
  });
  ctx.y -= 30;

  drawFooter(ctx, "Thank you for considering our services!");

  return doc.save();
};

export interface ReceiptPdfData {
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  items: ItemRow[];
  subtotal: number;
  vatAmount: number;
  total: number;
  vatRate: number;
  issueDate: string;
  dueDate: string;
  paidDate: string;
  paymentMethod?: string;
  notes?: string;
  businessName: string;
  businessEmail: string;
  businessAddress: string;
  businessPhone?: string;
  vatNumber?: string;
}

export interface TransactionPdfData {
  transactionId: string;
  description: string;
  type: 'income' | 'expense';
  amount: number;
  vatAmount: number;
  vatRate: number;
  date: string;
  category: string;
  clientName?: string;
  addedBy?: string;
  paidBy?: string;
  tenderUsed?: string;
  lineItems?: {
    product: string;
    department?: string;
    quantity: number;
    price: number;
    subtotal: number;
  }[];
  businessName: string;
  businessEmail: string;
  businessAddress: string;
  businessPhone?: string;
  vatNumber?: string;
}

export const generateTransactionPdf = async (data: TransactionPdfData): Promise<Uint8Array> => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([A4_WIDTH, A4_HEIGHT]);

  const ctx: PdfContext = { page, font, fontBold, y: A4_HEIGHT - MARGIN };
  const isIncome = data.type === 'income';
  const accentColor = isIncome ? COLORS.green : rgb(0.8, 0.2, 0.2);

  drawText(ctx, "TRANSACTION", MARGIN, {
    size: 28,
    bold: true,
    color: accentColor,
    align: "center",
    maxWidth: CONTENT_WIDTH,
  });
  ctx.y -= 18;
  drawText(ctx, data.transactionId, MARGIN, {
    size: 11,
    color: COLORS.gray,
    align: "center",
    maxWidth: CONTENT_WIDTH,
  });
  ctx.y -= 24;

  drawRect(ctx, MARGIN, CONTENT_WIDTH, 50, isIncome ? COLORS.greenBg : rgb(1, 0.92, 0.92));
  ctx.y -= 6;
  drawText(ctx, isIncome ? "Income" : "Expense", MARGIN, {
    size: 10,
    bold: true,
    color: accentColor,
    align: "center",
    maxWidth: CONTENT_WIDTH,
  });
  ctx.y -= 18;
  drawText(ctx, `\u00A3${data.amount.toFixed(2)}`, MARGIN, {
    size: 22,
    bold: true,
    color: accentColor,
    align: "center",
    maxWidth: CONTENT_WIDTH,
  });
  ctx.y -= 28;

  drawBusinessAndClient(
    ctx,
    {
      name: data.businessName,
      email: data.businessEmail,
      address: data.businessAddress,
      phone: data.businessPhone,
      vatNumber: data.vatNumber,
    },
    { name: data.clientName || data.description, email: '' },
    "Details For"
  );

  drawDateRow(ctx, "Date", data.date, "Category", data.category);
  ctx.y -= 16;

  if (data.lineItems && data.lineItems.length > 0) {
    const items: ItemRow[] = data.lineItems.map(li => ({
      description: li.product,
      quantity: li.quantity,
      unitPrice: li.price,
      total: li.subtotal,
    }));
    drawItemsTable(ctx, items, "\u00A3");
  }

  drawTotals(ctx, data.amount - data.vatAmount, data.vatAmount, data.vatRate, data.amount, "\u00A3", accentColor, "Total");

  if (data.addedBy || data.paidBy || data.tenderUsed) {
    ctx.y -= 8;
    drawLine(ctx, MARGIN, MARGIN + CONTENT_WIDTH);
    ctx.y -= 16;
    if (data.addedBy) {
      drawText(ctx, `Added By: ${data.addedBy}`, MARGIN, { size: 9, color: COLORS.gray });
      ctx.y -= 14;
    }
    if (data.paidBy) {
      drawText(ctx, `Paid By: ${data.paidBy}`, MARGIN, { size: 9, color: COLORS.gray });
      ctx.y -= 14;
    }
    if (data.tenderUsed) {
      drawText(ctx, `Payment Method: ${data.tenderUsed}`, MARGIN, { size: 9, color: COLORS.gray });
      ctx.y -= 14;
    }
  }

  drawFooter(ctx, "Transaction record generated automatically.");

  return doc.save();
};

export const generateReceiptPdf = async (data: ReceiptPdfData): Promise<Uint8Array> => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([A4_WIDTH, A4_HEIGHT]);

  const ctx: PdfContext = { page, font, fontBold, y: A4_HEIGHT - MARGIN };

  drawText(ctx, "PAYMENT RECEIPT", MARGIN, {
    size: 26,
    bold: true,
    color: COLORS.greenDark,
    align: "center",
    maxWidth: CONTENT_WIDTH,
  });
  ctx.y -= 18;
  drawText(ctx, `Invoice #${data.invoiceNumber}`, MARGIN, {
    size: 11,
    color: COLORS.gray,
    align: "center",
    maxWidth: CONTENT_WIDTH,
  });
  ctx.y -= 24;

  drawRect(ctx, MARGIN, CONTENT_WIDTH, 60, COLORS.greenBg);
  ctx.y -= 4;
  drawText(ctx, "Payment Received", MARGIN, {
    size: 10,
    bold: true,
    color: COLORS.greenDark,
    align: "center",
    maxWidth: CONTENT_WIDTH,
  });
  ctx.y -= 18;
  drawText(ctx, `\u00A3${data.total.toFixed(2)}`, MARGIN, {
    size: 22,
    bold: true,
    color: COLORS.greenDark,
    align: "center",
    maxWidth: CONTENT_WIDTH,
  });
  ctx.y -= 16;
  const paidInfo = `Paid on ${data.paidDate}${data.paymentMethod ? ` via ${data.paymentMethod}` : ""}`;
  drawText(ctx, paidInfo, MARGIN, {
    size: 9,
    color: COLORS.gray,
    align: "center",
    maxWidth: CONTENT_WIDTH,
  });
  ctx.y -= 24;

  drawBusinessAndClient(
    ctx,
    {
      name: data.businessName,
      email: data.businessEmail,
      address: data.businessAddress,
      phone: data.businessPhone,
      vatNumber: data.vatNumber,
    },
    { name: data.clientName, email: data.clientEmail },
    "Paid By"
  );

  drawItemsTable(ctx, data.items, "\u00A3");
  drawTotals(ctx, data.subtotal, data.vatAmount, data.vatRate, data.total, "\u00A3", COLORS.greenDark, "Total Paid");

  if (data.notes) {
    drawNotes(ctx, data.notes, COLORS.amberBg, COLORS.amber, COLORS.amber);
  }

  drawFooter(ctx, "Thank you for your payment!");
  ctx.y -= 14;
  drawText(ctx, "This receipt confirms your payment has been received in full.", MARGIN, {
    size: 8,
    color: COLORS.lightGray,
    align: "center",
    maxWidth: CONTENT_WIDTH,
  });

  return doc.save();
};
