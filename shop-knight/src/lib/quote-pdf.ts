import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

type QuoteLine = {
  description: string;
  qty: number;
  unitPrice: string | number;
  taxRate?: string | number | null;
};

type QuotePdfInput = {
  quoteNumber: string;
  title?: string | null;
  companyName?: string | null;
  customerName: string;
  opportunityName: string;
  quoteDate?: string | Date | null;
  dueDate?: string | Date | null;
  expiryDate?: string | Date | null;
  billingAddress?: string | null;
  shippingAddress?: string | null;
  installAddress?: string | null;
  customerContactRole?: string | null;
  salesRepName?: string | null;
  projectManagerName?: string | null;
  lines: QuoteLine[];
};

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 42;
const COLORS = {
  ink: rgb(0.06, 0.09, 0.16),
  muted: rgb(0.39, 0.45, 0.55),
  line: rgb(0.86, 0.89, 0.92),
  panel: rgb(0.97, 0.98, 0.99),
  accent: rgb(0.06, 0.46, 0.43),
  accentSoft: rgb(0.93, 0.99, 1),
  accentDark: rgb(0.08, 0.31, 0.29),
  white: rgb(1, 1, 1),
};

function money(value: unknown) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US');
}

function clean(value?: string | null) {
  return value?.trim() ? value.trim() : '—';
}

function wrapText(text: string, maxChars: number) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : ['—'];
}

export async function renderQuotePdf(input: QuotePdfInput) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const subtotal = input.lines.reduce((sum, line) => sum + Number(line.qty || 0) * Number(line.unitPrice || 0), 0);
  const tax = input.lines.reduce((sum, line) => sum + Number(line.qty || 0) * Number(line.unitPrice || 0) * Number(line.taxRate ?? 0), 0);
  const total = subtotal + tax;

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const drawText = (text: string, x: number, yy: number, opts?: { size?: number; font?: typeof regular; color?: ReturnType<typeof rgb> }) => {
    page.drawText(text, {
      x,
      y: yy,
      size: opts?.size ?? 11,
      font: opts?.font ?? regular,
      color: opts?.color ?? COLORS.ink,
    });
  };

  const drawWrapped = (text: string, x: number, yy: number, widthChars: number, lineHeight = 13, opts?: { size?: number; font?: typeof regular; color?: ReturnType<typeof rgb> }) => {
    const lines = wrapText(text, widthChars);
    lines.forEach((line, idx) => drawText(line, x, yy - idx * lineHeight, opts));
    return lines.length;
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < 50) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  };

  page.drawRectangle({ x: MARGIN, y: PAGE_HEIGHT - 126, width: PAGE_WIDTH - MARGIN * 2, height: 84, color: COLORS.accent });
  drawText(input.companyName?.trim() || 'Shop Knight', 58, PAGE_HEIGHT - 82, { size: 26, font: bold, color: COLORS.white });
  drawText('Customer Quote', 58, PAGE_HEIGHT - 108, { size: 11, color: rgb(0.82, 0.98, 0.9) });
  drawText('QUOTE', PAGE_WIDTH - 170, PAGE_HEIGHT - 82, { size: 24, font: bold, color: COLORS.white });
  drawText(`#${input.quoteNumber}`, PAGE_WIDTH - 136, PAGE_HEIGHT - 108, { size: 11, color: rgb(0.82, 0.98, 0.9) });

  y = PAGE_HEIGHT - 165;

  drawText('PREPARED FOR', 42, y, { size: 9, font: bold, color: COLORS.muted });
  drawText('QUOTE DETAILS', 322, y, { size: 9, font: bold, color: COLORS.muted });
  y -= 22;

  const leftInfo = [
    ['Customer', input.customerName],
    ['Project', input.opportunityName],
    ['Contact Role', input.customerContactRole],
  ] as const;
  const rightInfo = [
    ['Quote Date', formatDate(input.quoteDate)],
    ['Due Date', formatDate(input.dueDate)],
    ['Expiration', formatDate(input.expiryDate)],
    ['Sales Rep', input.salesRepName],
    ['Project Manager', input.projectManagerName],
  ] as const;

  let leftY = y;
  for (const [label, value] of leftInfo) {
    drawText(label.toUpperCase(), 42, leftY, { size: 9, font: bold, color: COLORS.muted });
    drawWrapped(clean(value), 42, leftY - 13, 32, 13, { size: 11 });
    leftY -= 40;
  }

  let rightY = y;
  for (const [label, value] of rightInfo) {
    drawText(label.toUpperCase(), 322, rightY, { size: 9, font: bold, color: COLORS.muted });
    drawWrapped(clean(value), 322, rightY - 13, 18, 13, { size: 11 });
    rightY -= 40;
  }

  y = Math.min(leftY, rightY) - 10;

  page.drawRectangle({ x: 42, y: y - 82, width: PAGE_WIDTH - 84, height: 98, color: COLORS.panel });
  drawText('ADDRESSES', 58, y, { size: 9, font: bold, color: COLORS.muted });
  const addressTop = y - 18;
  const cols = [
    { x: 58, label: 'Billing', value: input.billingAddress },
    { x: 232, label: 'Shipping', value: input.shippingAddress },
    { x: 406, label: 'Install', value: input.installAddress },
  ];
  for (const col of cols) {
    drawText(col.label.toUpperCase(), col.x, addressTop, { size: 9, font: bold, color: COLORS.muted });
    drawWrapped(clean(col.value), col.x, addressTop - 13, 18, 13, { size: 11 });
  }

  y -= 118;
  ensureSpace(180);

  drawText('LINE ITEMS', 42, y, { size: 9, font: bold, color: COLORS.muted });
  const tableTop = y - 16;
  page.drawRectangle({ x: 42, y: tableTop - 12, width: PAGE_WIDTH - 84, height: 28, color: COLORS.accentDark });
  drawText('Description', 52, tableTop - 3, { size: 10, font: bold, color: COLORS.white });
  drawText('Qty', 370, tableTop - 3, { size: 10, font: bold, color: COLORS.white });
  drawText('Unit', 425, tableTop - 3, { size: 10, font: bold, color: COLORS.white });
  drawText('Total', 500, tableTop - 3, { size: 10, font: bold, color: COLORS.white });

  y = tableTop - 26;

  input.lines.forEach((line, index) => {
    const wrapped = wrapText(line.description || 'Line item', 42);
    const rowHeight = Math.max(28, wrapped.length * 13 + 8);
    ensureSpace(rowHeight + 24);

    if (index % 2 === 0) {
      page.drawRectangle({ x: 42, y: y - rowHeight + 8, width: PAGE_WIDTH - 84, height: rowHeight, color: COLORS.panel });
    }

    drawText(String(index + 1).padStart(2, '0'), 52, y, { size: 10, font: bold });
    wrapped.forEach((part, idx) => drawText(part, 76, y - idx * 13, { size: 10 }));
    drawText(String(line.qty || 0), 370, y, { size: 10 });
    drawText(money(line.unitPrice), 425, y, { size: 10 });
    drawText(money(Number(line.qty || 0) * Number(line.unitPrice || 0)), 500, y, { size: 10, font: bold });

    y -= rowHeight + 8;
  });

  ensureSpace(120);
  page.drawRectangle({ x: 360, y: y - 72, width: 184, height: 92, color: COLORS.accentSoft });
  drawText('QUOTE TOTALS', 376, y + 6, { size: 10, font: bold, color: COLORS.accentDark });
  drawText('Subtotal', 376, y - 18, { size: 11 });
  drawText(money(subtotal), 454, y - 18, { size: 11 });
  drawText('Tax', 376, y - 36, { size: 11 });
  drawText(money(tax), 454, y - 36, { size: 11 });
  drawText('Total', 376, y - 54, { size: 14, font: bold });
  drawText(money(total), 454, y - 54, { size: 14, font: bold });

  page.drawLine({ start: { x: 42, y: 34 }, end: { x: 570, y: 34 }, thickness: 1, color: COLORS.line });
  drawText(`Quote ${input.quoteNumber} • Generated ${new Date().toLocaleDateString('en-US')}`, 42, 20, { size: 9, color: COLORS.muted });
  drawText('Thank you for the opportunity to earn your business.', 322, 20, { size: 9, color: COLORS.muted });

  return Buffer.from(await pdf.save());
}
