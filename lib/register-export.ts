import ExcelJS from "exceljs";
import { PDFDocument, PageSizes, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { effectiveStatus, paidAmount, type InvoiceRecord, type PaymentRecord } from "@/lib/data";

const navy = "102A43";
const teal = "2B7A78";

export async function invoiceWorkbook(records: InvoiceRecord[], filterDescription: string) {
  const rows = records.map((invoice) => {
    const received = paidAmount(invoice);
    return [
      `INV-${invoice.invoice_number}`,
      asDate(invoice.invoice_date),
      invoice.customer_name,
      invoice.customer_city,
      invoice.store_name,
      invoice.po_number,
      invoice.goods_receiving_number,
      statusLabel(effectiveStatus(invoice)),
      invoice.total_paisa / 100,
      received / 100,
      (invoice.status === "cancelled" ? 0 : Math.max(0, invoice.total_paisa - received)) / 100,
    ];
  });
  return buildWorkbook({
    title: "Invoice Register",
    filterDescription,
    sheetName: "Invoices",
    headers: ["Invoice", "Date", "Customer", "City", "Store", "PO number", "Goods receiving", "Status", "Total (PKR)", "Received (PKR)", "Balance (PKR)"],
    widths: [16, 14, 34, 18, 20, 18, 20, 18, 18, 18, 18],
    rows,
    dateColumns: [2],
    moneyColumns: [9, 10, 11],
  });
}

export async function paymentWorkbook(records: PaymentRecord[], filterDescription: string) {
  const rows = records.map((payment) => [
    asDate(payment.payment_date),
    payment.customer_name,
    payment.reference_number,
    (payment.payment_allocations ?? []).map((allocation) => `INV-${allocation.invoices?.invoice_number ?? "-"} (${formatPkrForExport(allocation.amount_paisa)})`).join(", "),
    payment.notes || null,
    payment.amount_paisa / 100,
  ]);
  return buildWorkbook({
    title: "Payment Register",
    filterDescription,
    sheetName: "Payments",
    headers: ["Date", "Customer", "Reference", "Allocated invoices", "Notes", "Amount (PKR)"],
    widths: [14, 34, 22, 48, 36, 18],
    rows,
    dateColumns: [1],
    moneyColumns: [6],
  });
}

async function buildWorkbook(options: { title: string; filterDescription: string; sheetName: string; headers: string[]; widths: number[]; rows: (string | number | Date | null)[][]; dateColumns: number[]; moneyColumns: number[] }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sameeja Commission Services";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(options.sheetName, { views: [{ state: "frozen", ySplit: 5, showGridLines: false }] });
  options.widths.forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
  sheet.mergeCells(1, 1, 1, options.headers.length);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = options.title;
  titleCell.font = { bold: true, color: { argb: `FF${navy}` }, size: 16 };
  titleCell.border = { bottom: { style: "medium", color: { argb: `FF${teal}` } } };
  titleCell.alignment = { vertical: "middle" };
  sheet.getRow(1).height = 30;
  sheet.mergeCells(2, 1, 2, options.headers.length);
  sheet.getCell(2, 1).value = options.filterDescription;
  sheet.getCell(2, 1).font = { color: { argb: "FF64748B" }, italic: true, size: 10 };
  sheet.mergeCells(3, 1, 3, options.headers.length);
  sheet.getCell(3, 1).value = `${options.rows.length.toLocaleString("en-PK")} records | Generated ${new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Karachi" }).format(new Date())}`;
  sheet.getCell(3, 1).font = { color: { argb: `FF${teal}` }, bold: true, size: 10 };

  const headerRow = sheet.getRow(5);
  headerRow.values = options.headers;
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${teal}` } };
    cell.alignment = { vertical: "middle", wrapText: true };
  });

  options.rows.forEach((values, rowIndex) => {
    const row = sheet.addRow(values);
    row.height = 23;
    row.eachCell((cell) => {
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.border = { bottom: { style: "hair", color: { argb: "FFE2E8F0" } } };
      if (rowIndex % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
    });
  });

  options.dateColumns.forEach((column) => { sheet.getColumn(column).numFmt = "dd-mmm-yyyy"; });
  options.moneyColumns.forEach((column) => { sheet.getColumn(column).numFmt = '"Rs" #,##0.00'; });
  sheet.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: options.headers.length } };
  sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
  sheet.headerFooter.oddFooter = "Sameeja Commission Services | Page &P of &N";
  const bytes = await workbook.xlsx.writeBuffer();
  return new Uint8Array(bytes);
}

export async function invoicePdf(records: InvoiceRecord[], filterDescription: string) {
  const rows = records.map((invoice) => {
    const received = paidAmount(invoice);
    return [
      `INV-${invoice.invoice_number}`,
      formatDate(invoice.invoice_date),
      invoice.customer_name,
      invoice.store_name,
      invoice.po_number || "-",
      statusLabel(effectiveStatus(invoice)),
      formatPkrForExport(invoice.total_paisa),
      formatPkrForExport(received),
      formatPkrForExport(invoice.status === "cancelled" ? 0 : Math.max(0, invoice.total_paisa - received)),
    ];
  });
  return buildPdf({ title: "Invoice Register", filterDescription, headers: ["Invoice", "Date", "Customer", "Store", "PO", "Status", "Total", "Received", "Balance"], widths: [65, 62, 132, 82, 72, 75, 78, 78, 78], rows, rightAligned: [6, 7, 8] });
}

export async function paymentPdf(records: PaymentRecord[], filterDescription: string) {
  const rows = records.map((payment) => [
    formatDate(payment.payment_date),
    payment.customer_name,
    payment.reference_number || "-",
    (payment.payment_allocations ?? []).map((allocation) => `INV-${allocation.invoices?.invoice_number ?? "-"}: ${formatPkrForExport(allocation.amount_paisa)}`).join(", "),
    formatPkrForExport(payment.amount_paisa),
  ]);
  return buildPdf({ title: "Payment Register", filterDescription, headers: ["Date", "Customer", "Reference", "Allocated invoices", "Amount"], widths: [72, 180, 110, 245, 105], rows, rightAligned: [4] });
}

async function buildPdf(options: { title: string; filterDescription: string; headers: string[]; widths: number[]; rows: string[][]; rightAligned: number[] }) {
  const document = await PDFDocument.create();
  document.setTitle(`${options.title} - Sameeja Commission Services`);
  document.setAuthor("Sameeja Commission Services");
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const pages: PDFPage[] = [];
  let page = addReportPage(document, pages, options.title, options.filterDescription, regular, bold);
  let y = 476;
  drawPdfHeader(page, y, options.headers, options.widths, bold);
  y -= 24;
  options.rows.forEach((row, rowIndex) => {
    if (y < 54) {
      page = addReportPage(document, pages, options.title, options.filterDescription, regular, bold);
      y = 476;
      drawPdfHeader(page, y, options.headers, options.widths, bold);
      y -= 24;
    }
    if (rowIndex % 2 === 1) page.drawRectangle({ x: 28, y: y - 19, width: options.widths.reduce((sum, width) => sum + width, 0), height: 24, color: rgb(0.973, 0.98, 0.988) });
    let x = 28;
    row.forEach((rawValue, columnIndex) => {
      const value = truncatePdfText(rawValue, regular, 7.5, options.widths[columnIndex] - 8);
      const textWidth = regular.widthOfTextAtSize(value, 7.5);
      const textX = options.rightAligned.includes(columnIndex) ? x + options.widths[columnIndex] - textWidth - 5 : x + 4;
      page.drawText(value, { x: textX, y: y - 11, size: 7.5, font: regular, color: rgb(0.15, 0.2, 0.28) });
      x += options.widths[columnIndex];
    });
    page.drawLine({ start: { x: 28, y: y - 19 }, end: { x: 28 + options.widths.reduce((sum, width) => sum + width, 0), y: y - 19 }, thickness: 0.35, color: rgb(0.88, 0.91, 0.94) });
    y -= 24;
  });

  pages.forEach((reportPage, index) => {
    const footer = `Sameeja Commission Services | Page ${index + 1} of ${pages.length}`;
    reportPage.drawText(footer, { x: 28, y: 22, size: 7.5, font: regular, color: rgb(0.4, 0.46, 0.55) });
  });
  return document.save();
}

function addReportPage(document: PDFDocument, pages: PDFPage[], title: string, filterDescription: string, regular: PDFFont, bold: PDFFont) {
  const page = document.addPage([PageSizes.A4[1], PageSizes.A4[0]]);
  pages.push(page);
  const { width, height } = page.getSize();
  page.drawRectangle({ x: 0, y: height - 82, width, height: 82, color: rgb(0.063, 0.165, 0.263) });
  page.drawText("SAMEEJA COMMISSION SERVICES", { x: 28, y: height - 29, size: 8, font: bold, color: rgb(0.75, 0.83, 0.89) });
  page.drawText(title, { x: 28, y: height - 54, size: 20, font: bold, color: rgb(1, 1, 1) });
  page.drawText(truncatePdfText(filterDescription, regular, 8, width - 56), { x: 28, y: height - 70, size: 8, font: regular, color: rgb(0.86, 0.91, 0.95) });
  page.drawText(`${new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Karachi" }).format(new Date())}`, { x: width - 150, y: height - 29, size: 7.5, font: regular, color: rgb(0.75, 0.83, 0.89) });
  return page;
}

function drawPdfHeader(page: PDFPage, y: number, headers: string[], widths: number[], font: PDFFont) {
  const totalWidth = widths.reduce((sum, width) => sum + width, 0);
  page.drawRectangle({ x: 28, y: y - 18, width: totalWidth, height: 23, color: rgb(0.906, 0.953, 0.949) });
  let x = 28;
  headers.forEach((header, index) => {
    page.drawText(truncatePdfText(header, font, 7.5, widths[index] - 8), { x: x + 4, y: y - 10, size: 7.5, font, color: rgb(0.063, 0.165, 0.263) });
    x += widths[index];
  });
}

function truncatePdfText(value: string, font: PDFFont, size: number, width: number) {
  const safe = value.replace(/[\u2013\u2014]/g, "-").replace(/[^\x20-\x7E]/g, "?");
  if (font.widthOfTextAtSize(safe, size) <= width) return safe;
  let result = safe;
  while (result.length > 1 && font.widthOfTextAtSize(`${result}...`, size) > width) result = result.slice(0, -1);
  return `${result}...`;
}

function asDate(value: string) { return new Date(`${value}T00:00:00Z`); }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-PK", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(asDate(value)); }
function formatPkrForExport(paisa: number) { return `Rs ${(paisa / 100).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function statusLabel(status: ReturnType<typeof effectiveStatus>) { return status === "pending_review" ? "Awaiting review" : status.split("_").map((word) => word[0].toUpperCase() + word.slice(1)).join(" "); }
