import { asc, desc, eq, sql } from "drizzle-orm";
import { getDatabase, isDatabaseConfigured } from "@/lib/db";
import { appUsers, invoiceItems, invoices, paymentAllocations, payments, products } from "@/lib/db/schema";
import { isDemoModeEnabled } from "@/lib/demo";

export type InvoiceItemRecord = {
  id: string;
  product_id: string | null;
  mgm_code: string;
  subsys_code: string;
  article_name: string;
  unit: string;
  quantity_millis: number;
  rate_paisa: number;
  total_paisa: number;
  position: number;
};

export type ProductRecord = {
  id: string;
  mgm_code: string;
  subsys_code: string;
  article_name: string;
  unit: string;
  default_rate_paisa: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type InvoiceRecord = {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_city: string;
  supplier_number: string;
  store_number: string;
  store_name: string;
  invoice_date: string;
  po_number: string;
  goods_receiving_number: string;
  status: "pending_review" | "issued" | "cancelled";
  total_paisa: number;
  notes: string;
  created_at: string;
  invoice_items?: InvoiceItemRecord[];
  payment_allocations?: { amount_paisa: number }[];
};

export type PaymentRecord = {
  id: string;
  customer_name: string;
  payment_date: string;
  amount_paisa: number;
  reference_number: string;
  notes: string;
  created_at: string;
  payment_allocations?: { amount_paisa: number; invoices?: { invoice_number: string; store_name: string } }[];
};

const demoInvoices: InvoiceRecord[] = [
  {
    id: "demo-172",
    invoice_number: "172",
    customer_name: "Metro Cash & Carry Pakistan (Pvt.) Ltd",
    customer_city: "Lahore",
    supplier_number: "23558",
    store_number: "15",
    store_name: "Faisalabad",
    invoice_date: "2026-07-06",
    po_number: "618790003",
    goods_receiving_number: "587132",
    status: "issued",
    total_paisa: 100714900,
    notes: "",
    created_at: "2026-07-06T09:00:00Z",
    payment_allocations: [{ amount_paisa: 50357500 }],
    invoice_items: [
      { id: "demo-1", product_id: null, position: 0, mgm_code: "331394", subsys_code: "322313", article_name: "Prime Whole Carcas Goat", unit: "Kg", quantity_millis: 355200, rate_paisa: 232000, total_paisa: 82406400 },
      { id: "demo-2", product_id: null, position: 1, mgm_code: "331397", subsys_code: "322316", article_name: "Whole FQ Veal", unit: "Kg", quantity_millis: 60500, rate_paisa: 120000, total_paisa: 7260000 },
      { id: "demo-3", product_id: null, position: 2, mgm_code: "331398", subsys_code: "322317", article_name: "Whole HQ Veal", unit: "Kg", quantity_millis: 69000, rate_paisa: 120000, total_paisa: 8280000 },
      { id: "demo-4", product_id: null, position: 3, mgm_code: "338287", subsys_code: "256261", article_name: "Prime Whole Carcas Lamb", unit: "Kg", quantity_millis: 11300, rate_paisa: 245000, total_paisa: 2768500 },
    ],
  },
  { id: "demo-171", invoice_number: "171", customer_name: "Metro Cash & Carry Pakistan (Pvt.) Ltd", customer_city: "Multan", supplier_number: "23558", store_number: "18", store_name: "Multan", invoice_date: "2026-07-02", po_number: "618789944", goods_receiving_number: "587001", status: "issued", total_paisa: 24891600, notes: "", created_at: "2026-07-02T09:00:00Z", payment_allocations: [] },
  { id: "demo-170", invoice_number: "170", customer_name: "Metro Cash & Carry Pakistan (Pvt.) Ltd", customer_city: "Lahore", supplier_number: "23558", store_number: "12", store_name: "Lahore", invoice_date: "2026-06-28", po_number: "618789810", goods_receiving_number: "586925", status: "issued", total_paisa: 43108400, notes: "", created_at: "2026-06-28T09:00:00Z", payment_allocations: [{ amount_paisa: 43108400 }] },
  { id: "demo-review", invoice_number: "173", customer_name: "Metro Cash & Carry Pakistan (Pvt.) Ltd", customer_city: "Multan", supplier_number: "23558", store_number: "18", store_name: "Multan", invoice_date: "2026-07-08", po_number: "", goods_receiving_number: "", status: "pending_review", total_paisa: 19870000, notes: "", created_at: "2026-07-08T09:00:00Z", payment_allocations: [] },
];

const demoPayments: PaymentRecord[] = [
  { id: "payment-1", customer_name: "Metro Cash & Carry Pakistan (Pvt.) Ltd", payment_date: "2026-07-09", amount_paisa: 50357500, reference_number: "BANK-0907", notes: "", created_at: "2026-07-09T10:00:00Z", payment_allocations: [{ amount_paisa: 50357500, invoices: { invoice_number: "172", store_name: "Faisalabad" } }] },
  { id: "payment-2", customer_name: "Metro Cash & Carry Pakistan (Pvt.) Ltd", payment_date: "2026-07-08", amount_paisa: 43108400, reference_number: "BANK-0807", notes: "", created_at: "2026-07-08T11:30:00Z", payment_allocations: [{ amount_paisa: 43108400, invoices: { invoice_number: "170", store_name: "Multan" } }] },
];

export function paidAmount(invoice: InvoiceRecord) {
  return (invoice.payment_allocations ?? []).reduce((sum, item) => sum + Number(item.amount_paisa), 0);
}

export function effectiveStatus(invoice: InvoiceRecord) {
  if (invoice.status === "pending_review" || invoice.status === "cancelled") return invoice.status;
  const paid = paidAmount(invoice);
  if (paid >= invoice.total_paisa) return "paid" as const;
  if (paid > 0) return "partially_paid" as const;
  return "unpaid" as const;
}

export async function getInvoices(): Promise<InvoiceRecord[]> {
  if (!isDatabaseConfigured()) return isDemoModeEnabled() ? demoInvoices : [];
  const database = getDatabase();
  const rows = await database.select({
    invoice: invoices,
    paidPaisa: sql<number>`coalesce(sum(${paymentAllocations.amountPaisa}), 0)`.mapWith(Number),
  })
    .from(invoices)
    .leftJoin(paymentAllocations, eq(paymentAllocations.invoiceId, invoices.id))
    .groupBy(invoices.id)
    .orderBy(desc(invoices.invoiceDate), desc(invoices.createdAt))
    .limit(200);
  return rows.map(({ invoice, paidPaisa }) => toInvoiceRecord(invoice, [], paidPaisa > 0 ? [{ amount_paisa: paidPaisa }] : []));
}

export async function getInvoice(id: string): Promise<InvoiceRecord | null> {
  if (!isDatabaseConfigured()) return isDemoModeEnabled() ? demoInvoices.find((invoice) => invoice.id === id) ?? null : null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return null;
  const database = getDatabase();
  const [rows, items] = await Promise.all([
    database.select({
      invoice: invoices,
      paidPaisa: sql<number>`coalesce(sum(${paymentAllocations.amountPaisa}), 0)`.mapWith(Number),
    })
      .from(invoices)
      .leftJoin(paymentAllocations, eq(paymentAllocations.invoiceId, invoices.id))
      .where(eq(invoices.id, id))
      .groupBy(invoices.id)
      .limit(1),
    database.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id)).orderBy(asc(invoiceItems.position)),
  ]);
  if (!rows[0]) return null;
  return toInvoiceRecord(rows[0].invoice, items.map(toInvoiceItemRecord), rows[0].paidPaisa > 0 ? [{ amount_paisa: rows[0].paidPaisa }] : []);
}

export async function getOpenInvoices() {
  const invoices = await getInvoices();
  return invoices.filter((invoice) => invoice.status === "issued" && paidAmount(invoice) < invoice.total_paisa);
}

export async function getPayments(): Promise<PaymentRecord[]> {
  if (!isDatabaseConfigured()) return isDemoModeEnabled() ? demoPayments : [];
  const database = getDatabase();
  const rows = await database.select({
    payment: payments,
    allocations: sql<{ amount_paisa: number; invoice_number: string; store_name: string }[]>`
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'amount_paisa', ${paymentAllocations.amountPaisa},
            'invoice_number', ${invoices.invoiceNumber},
            'store_name', ${invoices.storeName}
          ) order by ${paymentAllocations.createdAt}
        ) filter (where ${paymentAllocations.id} is not null),
        '[]'::jsonb
      )
    `,
  })
    .from(payments)
    .leftJoin(paymentAllocations, eq(paymentAllocations.paymentId, payments.id))
    .leftJoin(invoices, eq(invoices.id, paymentAllocations.invoiceId))
    .groupBy(payments.id)
    .orderBy(desc(payments.paymentDate), desc(payments.createdAt))
    .limit(100);
  return rows.map(({ payment, allocations }) => ({
    id: payment.id,
    customer_name: payment.customerName,
    payment_date: payment.paymentDate,
    amount_paisa: payment.amountPaisa,
    reference_number: payment.referenceNumber,
    notes: payment.notes,
    created_at: payment.createdAt,
    payment_allocations: allocations.map((allocation) => ({
      amount_paisa: Number(allocation.amount_paisa),
      invoices: { invoice_number: allocation.invoice_number, store_name: allocation.store_name },
    })),
  }));
}

export async function getTeam(): Promise<{ id: string; display_name: string; email: string; role: "owner" | "staff"; is_active: boolean; created_at: string }[]> {
  if (!isDatabaseConfigured()) return isDemoModeEnabled() ? [
    { id: "demo-owner", display_name: "Business Owner", email: "owner@sameeja.test", role: "owner", is_active: true, created_at: "2026-07-01T00:00:00Z" },
    { id: "demo-staff", display_name: "Invoice Staff", email: "staff@sameeja.test", role: "staff", is_active: true, created_at: "2026-07-02T00:00:00Z" },
  ] : [];
  const rows = await getDatabase().select().from(appUsers).orderBy(asc(appUsers.createdAt));
  return rows.map((member) => ({ id: member.id, display_name: member.displayName, email: member.email, role: member.role as "owner" | "staff", is_active: member.isActive, created_at: member.createdAt }));
}

export async function getProducts(options: { activeOnly?: boolean } = {}): Promise<ProductRecord[]> {
  if (!isDatabaseConfigured()) return [];
  const rows = await getDatabase().select().from(products).orderBy(asc(products.articleName));
  return rows
    .filter((product) => !options.activeOnly || product.isActive)
    .map((product) => ({
      id: product.id,
      mgm_code: product.mgmCode,
      subsys_code: product.subsysCode,
      article_name: product.articleName,
      unit: product.unit,
      default_rate_paisa: product.defaultRatePaisa,
      is_active: product.isActive,
      created_at: product.createdAt,
      updated_at: product.updatedAt,
    }));
}

export function isDemoMode() {
  return isDemoModeEnabled();
}

function toInvoiceRecord(row: typeof invoices.$inferSelect, items: InvoiceItemRecord[], allocations: { amount_paisa: number }[]): InvoiceRecord {
  return {
    id: row.id,
    invoice_number: row.invoiceNumber,
    customer_name: row.customerName,
    customer_city: row.customerCity,
    supplier_number: row.supplierNumber,
    store_number: row.storeNumber,
    store_name: row.storeName,
    invoice_date: row.invoiceDate,
    po_number: row.poNumber,
    goods_receiving_number: row.goodsReceivingNumber,
    status: row.status as InvoiceRecord["status"],
    total_paisa: row.totalPaisa,
    notes: row.notes,
    created_at: row.createdAt,
    invoice_items: items,
    payment_allocations: allocations,
  };
}

function toInvoiceItemRecord(row: typeof invoiceItems.$inferSelect): InvoiceItemRecord {
  return {
    id: row.id,
    product_id: row.productId,
    mgm_code: row.mgmCode,
    subsys_code: row.subsysCode,
    article_name: row.articleName,
    unit: row.unit,
    quantity_millis: row.quantityMillis,
    rate_paisa: row.ratePaisa,
    total_paisa: row.totalPaisa,
    position: row.position,
  };
}
