import { parseKg, parsePkr } from "@/lib/money";

type InputItem = {
  mgmCode?: unknown;
  subsysCode?: unknown;
  articleName?: unknown;
  unit?: unknown;
  quantity?: unknown;
  rate?: unknown;
};

type InvoiceInput = {
  invoiceNumber?: unknown;
  customerName?: unknown;
  customerCity?: unknown;
  supplierNumber?: unknown;
  storeNumber?: unknown;
  storeName?: unknown;
  invoiceDate?: unknown;
  poNumber?: unknown;
  goodsReceivingNumber?: unknown;
  notes?: unknown;
  items?: unknown;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeInvoicePayload(input: InvoiceInput) {
  const invoice = {
    invoice_number: clean(input.invoiceNumber),
    customer_name: clean(input.customerName),
    customer_city: clean(input.customerCity),
    supplier_number: clean(input.supplierNumber),
    store_number: clean(input.storeNumber),
    store_name: clean(input.storeName),
    invoice_date: clean(input.invoiceDate),
    po_number: clean(input.poNumber),
    goods_receiving_number: clean(input.goodsReceivingNumber),
    notes: clean(input.notes),
  };

  if (!invoice.invoice_number || !invoice.customer_name || !invoice.store_name || !/^\d{4}-\d{2}-\d{2}$/.test(invoice.invoice_date)) {
    throw new Error("Invoice number, customer, store and a valid date are required.");
  }

  const rawItems = Array.isArray(input.items) ? input.items as InputItem[] : [];
  const items = rawItems.map((item) => {
    const quantityMillis = parseKg(item.quantity);
    const ratePaisa = parsePkr(item.rate);
    const articleName = clean(item.articleName);
    if (!articleName || quantityMillis === null || quantityMillis <= 0 || ratePaisa === null || ratePaisa <= 0) return null;
    return {
      mgm_code: clean(item.mgmCode),
      subsys_code: clean(item.subsysCode),
      article_name: articleName,
      unit: clean(item.unit) || "Kg",
      quantity_millis: quantityMillis,
      rate_paisa: ratePaisa,
      total_paisa: Math.round((quantityMillis * ratePaisa) / 1000),
    };
  }).filter((item): item is NonNullable<typeof item> => item !== null);

  if (items.length === 0) throw new Error("Add at least one article with quantity and rate.");
  return { invoice, items };
}
