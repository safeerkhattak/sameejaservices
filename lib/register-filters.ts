export const invoiceStatusOptions = ["pending_review", "unpaid", "partially_paid", "paid", "cancelled"] as const;
export type InvoiceRegisterStatus = typeof invoiceStatusOptions[number];

export type InvoiceRegisterFilters = {
  q: string;
  from: string;
  to: string;
  customerId: string;
  status: InvoiceRegisterStatus | "";
};

export type PaymentRegisterFilters = {
  q: string;
  from: string;
  to: string;
  customerId: string;
};

type SearchValues = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function cleanText(value: string | string[] | undefined, max = 100) {
  return first(value).trim().slice(0, max);
}

function cleanDate(value: string | string[] | undefined) {
  const date = first(value).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
}

function cleanUuid(value: string | string[] | undefined) {
  const id = first(value).trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? id : "";
}

export function parseInvoiceRegisterFilters(values: SearchValues): InvoiceRegisterFilters {
  const status = cleanText(values.status, 30);
  return {
    q: cleanText(values.q),
    from: cleanDate(values.from),
    to: cleanDate(values.to),
    customerId: cleanUuid(values.customerId),
    status: invoiceStatusOptions.includes(status as InvoiceRegisterStatus) ? status as InvoiceRegisterStatus : "",
  };
}

export function parsePaymentRegisterFilters(values: SearchValues): PaymentRegisterFilters {
  return {
    q: cleanText(values.q),
    from: cleanDate(values.from),
    to: cleanDate(values.to),
    customerId: cleanUuid(values.customerId),
  };
}

export function filterParams(filters: InvoiceRegisterFilters | PaymentRegisterFilters) {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value)) as Record<string, string>;
}

export function filterSummary(filters: InvoiceRegisterFilters | PaymentRegisterFilters, customerName = "") {
  const parts: string[] = [];
  if (filters.from || filters.to) parts.push(`${filters.from || "Beginning"} to ${filters.to || "Present"}`);
  if (customerName) parts.push(`Customer: ${customerName}`);
  if (filters.q) parts.push(`Search: ${filters.q}`);
  if ("status" in filters && filters.status) parts.push(`Status: ${filters.status.replaceAll("_", " ")}`);
  return parts.join(" | ") || "All records";
}
