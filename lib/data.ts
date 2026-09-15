import { and, asc, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { getDatabase, isDatabaseConfigured } from "@/lib/db";
import { appUsers, customers, invoiceItems, invoices, paymentAllocations, payments, products } from "@/lib/db/schema";
import { isDemoModeEnabled } from "@/lib/demo";
import type { InvoiceRegisterFilters, PaymentRegisterFilters } from "@/lib/register-filters";

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

export type CustomerRecord = {
  id: string;
  name: string;
  city: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type InvoiceRecord = {
  id: string;
  invoice_number: string;
  customer_id: string;
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
  customer_id: string;
  customer_name: string;
  payment_date: string;
  amount_paisa: number;
  reference_number: string;
  notes: string;
  created_at: string;
  payment_allocations?: { amount_paisa: number; invoices?: { invoice_number: string; store_name: string } }[];
};

export type DashboardData = {
  total_invoiced_paisa: number;
  total_received_paisa: number;
  outstanding_paisa: number;
  issued_count: number;
  outstanding_count: number;
  awaiting_review_count: number;
  paid_count: number;
  partially_paid_count: number;
  unpaid_count: number;
  attention: InvoiceRecord[];
};

export type PaginatedResult<T> = {
  records: T[];
  page: number;
  page_size: number;
  total_records: number;
  total_pages: number;
};

const demoInvoices: InvoiceRecord[] = [
  {
    id: "demo-172",
    invoice_number: "172",
    customer_id: "00000000-0000-4000-8000-000000000010",
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
  { id: "demo-171", invoice_number: "171", customer_id: "00000000-0000-4000-8000-000000000010", customer_name: "Metro Cash & Carry Pakistan (Pvt.) Ltd", customer_city: "Multan", supplier_number: "23558", store_number: "18", store_name: "Multan", invoice_date: "2026-07-02", po_number: "618789944", goods_receiving_number: "587001", status: "issued", total_paisa: 24891600, notes: "", created_at: "2026-07-02T09:00:00Z", payment_allocations: [] },
  { id: "demo-170", invoice_number: "170", customer_id: "00000000-0000-4000-8000-000000000010", customer_name: "Metro Cash & Carry Pakistan (Pvt.) Ltd", customer_city: "Lahore", supplier_number: "23558", store_number: "12", store_name: "Lahore", invoice_date: "2026-06-28", po_number: "618789810", goods_receiving_number: "586925", status: "issued", total_paisa: 43108400, notes: "", created_at: "2026-06-28T09:00:00Z", payment_allocations: [{ amount_paisa: 43108400 }] },
  { id: "demo-review", invoice_number: "173", customer_id: "00000000-0000-4000-8000-000000000010", customer_name: "Metro Cash & Carry Pakistan (Pvt.) Ltd", customer_city: "Multan", supplier_number: "23558", store_number: "18", store_name: "Multan", invoice_date: "2026-07-08", po_number: "", goods_receiving_number: "", status: "pending_review", total_paisa: 19870000, notes: "", created_at: "2026-07-08T09:00:00Z", payment_allocations: [] },
];

const demoPayments: PaymentRecord[] = [
  { id: "payment-1", customer_id: "00000000-0000-4000-8000-000000000010", customer_name: "Metro Cash & Carry Pakistan (Pvt.) Ltd", payment_date: "2026-07-09", amount_paisa: 50357500, reference_number: "BANK-0907", notes: "", created_at: "2026-07-09T10:00:00Z", payment_allocations: [{ amount_paisa: 50357500, invoices: { invoice_number: "172", store_name: "Faisalabad" } }] },
  { id: "payment-2", customer_id: "00000000-0000-4000-8000-000000000010", customer_name: "Metro Cash & Carry Pakistan (Pvt.) Ltd", payment_date: "2026-07-08", amount_paisa: 43108400, reference_number: "BANK-0807", notes: "", created_at: "2026-07-08T11:30:00Z", payment_allocations: [{ amount_paisa: 43108400, invoices: { invoice_number: "170", store_name: "Multan" } }] },
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

function invoiceAllocationTotals(database: ReturnType<typeof getDatabase>) {
  return database
    .select({
      invoiceId: paymentAllocations.invoiceId,
      paidPaisa: sql<number>`sum(${paymentAllocations.amountPaisa})`.mapWith(Number).as("paid_paisa"),
    })
    .from(paymentAllocations)
    .groupBy(paymentAllocations.invoiceId)
    .as("invoice_allocation_totals");
}

function demoDashboardData(): DashboardData {
  const issued = demoInvoices.filter((invoice) => invoice.status === "issued");
  const totalInvoiced = issued.reduce((sum, invoice) => sum + invoice.total_paisa, 0);
  const totalReceived = demoPayments.reduce((sum, payment) => sum + payment.amount_paisa, 0);
  const attention = demoInvoices
    .filter((invoice) => invoice.status === "pending_review" || (invoice.status === "issued" && paidAmount(invoice) < invoice.total_paisa))
    .slice(0, 6);

  return {
    total_invoiced_paisa: totalInvoiced,
    total_received_paisa: totalReceived,
    outstanding_paisa: issued.reduce((sum, invoice) => sum + Math.max(0, invoice.total_paisa - paidAmount(invoice)), 0),
    issued_count: issued.length,
    outstanding_count: issued.filter((invoice) => paidAmount(invoice) < invoice.total_paisa).length,
    awaiting_review_count: demoInvoices.filter((invoice) => invoice.status === "pending_review").length,
    paid_count: issued.filter((invoice) => effectiveStatus(invoice) === "paid").length,
    partially_paid_count: issued.filter((invoice) => effectiveStatus(invoice) === "partially_paid").length,
    unpaid_count: issued.filter((invoice) => effectiveStatus(invoice) === "unpaid").length,
    attention,
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  if (!isDatabaseConfigured()) {
    return isDemoModeEnabled() ? demoDashboardData() : {
      total_invoiced_paisa: 0,
      total_received_paisa: 0,
      outstanding_paisa: 0,
      issued_count: 0,
      outstanding_count: 0,
      awaiting_review_count: 0,
      paid_count: 0,
      partially_paid_count: 0,
      unpaid_count: 0,
      attention: [],
    };
  }

  const database = getDatabase();
  const allocationTotals = invoiceAllocationTotals(database);
  const paid = sql`coalesce(${allocationTotals.paidPaisa}, 0)`;
  const [metricRows, attentionRows] = await Promise.all([
    database
      .select({
        totalInvoicedPaisa: sql<number>`coalesce(sum(${invoices.totalPaisa}) filter (where ${invoices.status} = 'issued'), 0)`.mapWith(Number),
        totalReceivedPaisa: sql<number>`(select coalesce(sum(${payments.amountPaisa}), 0) from ${payments})`.mapWith(Number),
        outstandingPaisa: sql<number>`coalesce(sum(greatest(${invoices.totalPaisa} - ${paid}, 0)) filter (where ${invoices.status} = 'issued'), 0)`.mapWith(Number),
        issuedCount: sql<number>`count(*) filter (where ${invoices.status} = 'issued')`.mapWith(Number),
        outstandingCount: sql<number>`count(*) filter (where ${invoices.status} = 'issued' and ${paid} < ${invoices.totalPaisa})`.mapWith(Number),
        awaitingReviewCount: sql<number>`count(*) filter (where ${invoices.status} = 'pending_review')`.mapWith(Number),
        paidCount: sql<number>`count(*) filter (where ${invoices.status} = 'issued' and ${paid} >= ${invoices.totalPaisa})`.mapWith(Number),
        partiallyPaidCount: sql<number>`count(*) filter (where ${invoices.status} = 'issued' and ${paid} > 0 and ${paid} < ${invoices.totalPaisa})`.mapWith(Number),
        unpaidCount: sql<number>`count(*) filter (where ${invoices.status} = 'issued' and ${paid} = 0)`.mapWith(Number),
      })
      .from(invoices)
      .leftJoin(allocationTotals, eq(allocationTotals.invoiceId, invoices.id)),
    database
      .select({ invoice: invoices, paidPaisa: sql<number>`${paid}`.mapWith(Number) })
      .from(invoices)
      .leftJoin(allocationTotals, eq(allocationTotals.invoiceId, invoices.id))
      .where(sql`${invoices.status} = 'pending_review' or (${invoices.status} = 'issued' and ${paid} < ${invoices.totalPaisa})`)
      .orderBy(desc(invoices.invoiceDate), desc(invoices.createdAt))
      .limit(6),
  ]);

  const metrics = metricRows[0];
  return {
    total_invoiced_paisa: metrics.totalInvoicedPaisa,
    total_received_paisa: metrics.totalReceivedPaisa,
    outstanding_paisa: metrics.outstandingPaisa,
    issued_count: metrics.issuedCount,
    outstanding_count: metrics.outstandingCount,
    awaiting_review_count: metrics.awaitingReviewCount,
    paid_count: metrics.paidCount,
    partially_paid_count: metrics.partiallyPaidCount,
    unpaid_count: metrics.unpaidCount,
    attention: attentionRows.map(({ invoice, paidPaisa }) => toInvoiceRecord(invoice, [], paidPaisa > 0 ? [{ amount_paisa: paidPaisa }] : [])),
  };
}

type InvoiceQueryOptions = Partial<InvoiceRegisterFilters>;
type PaymentQueryOptions = Partial<PaymentRegisterFilters>;

function invoiceWhere(options: InvoiceQueryOptions, allocationTotals: ReturnType<typeof invoiceAllocationTotals>) {
  const conditions: SQL[] = [];
  const query = options.q?.trim().slice(0, 100) ?? "";
  if (query) {
    const pattern = `%${query}%`;
    conditions.push(or(
      ilike(invoices.invoiceNumber, pattern),
      ilike(invoices.customerName, pattern),
      ilike(invoices.customerCity, pattern),
      ilike(invoices.storeName, pattern),
      ilike(invoices.supplierNumber, pattern),
      ilike(invoices.poNumber, pattern),
      ilike(invoices.goodsReceivingNumber, pattern),
    )!);
  }
  if (options.from) conditions.push(gte(invoices.invoiceDate, options.from));
  if (options.to) conditions.push(lte(invoices.invoiceDate, options.to));
  if (options.customerId) conditions.push(eq(invoices.customerId, options.customerId));

  const paid = sql`coalesce(${allocationTotals.paidPaisa}, 0)`;
  if (options.status === "pending_review") conditions.push(eq(invoices.status, "pending_review"));
  if (options.status === "cancelled") conditions.push(eq(invoices.status, "cancelled"));
  if (options.status === "unpaid") conditions.push(and(eq(invoices.status, "issued"), sql`${paid} = 0`)!);
  if (options.status === "partially_paid") conditions.push(and(eq(invoices.status, "issued"), sql`${paid} > 0`, sql`${paid} < ${invoices.totalPaisa}`)!);
  if (options.status === "paid") conditions.push(and(eq(invoices.status, "issued"), sql`${paid} >= ${invoices.totalPaisa}`)!);
  return conditions.length ? and(...conditions) : undefined;
}

function paymentWhere(options: PaymentQueryOptions) {
  const conditions: SQL[] = [];
  const query = options.q?.trim().slice(0, 100) ?? "";
  if (query) {
    const pattern = `%${query}%`;
    conditions.push(or(
      ilike(payments.customerName, pattern),
      ilike(payments.referenceNumber, pattern),
      ilike(payments.notes, pattern),
      sql`exists (
        select 1
        from payment_allocations allocation_search
        inner join invoices invoice_search on invoice_search.id = allocation_search.invoice_id
        where allocation_search.payment_id = ${payments.id}
          and (invoice_search.invoice_number ilike ${pattern} or invoice_search.store_name ilike ${pattern})
      )`,
    )!);
  }
  if (options.from) conditions.push(gte(payments.paymentDate, options.from));
  if (options.to) conditions.push(lte(payments.paymentDate, options.to));
  if (options.customerId) conditions.push(eq(payments.customerId, options.customerId));
  return conditions.length ? and(...conditions) : undefined;
}

function filterDemoInvoices(records: InvoiceRecord[], options: InvoiceQueryOptions) {
  const query = options.q?.toLowerCase() ?? "";
  return records.filter((invoice) => {
    const matchesQuery = !query || [invoice.invoice_number, invoice.customer_name, invoice.customer_city, invoice.store_name, invoice.supplier_number, invoice.po_number, invoice.goods_receiving_number].some((value) => value.toLowerCase().includes(query));
    const matchesDates = (!options.from || invoice.invoice_date >= options.from) && (!options.to || invoice.invoice_date <= options.to);
    const matchesCustomer = !options.customerId || invoice.customer_id === options.customerId;
    const matchesStatus = !options.status || effectiveStatus(invoice) === options.status;
    return matchesQuery && matchesDates && matchesCustomer && matchesStatus;
  });
}

function filterDemoPayments(records: PaymentRecord[], options: PaymentQueryOptions) {
  const query = options.q?.toLowerCase() ?? "";
  return records.filter((payment) => {
    const allocationText = (payment.payment_allocations ?? []).map((allocation) => `${allocation.invoices?.invoice_number ?? ""} ${allocation.invoices?.store_name ?? ""}`).join(" ");
    const matchesQuery = !query || [payment.customer_name, payment.reference_number, payment.notes, allocationText].some((value) => value.toLowerCase().includes(query));
    const matchesDates = (!options.from || payment.payment_date >= options.from) && (!options.to || payment.payment_date <= options.to);
    const matchesCustomer = !options.customerId || payment.customer_id === options.customerId;
    return matchesQuery && matchesDates && matchesCustomer;
  });
}

export async function getInvoicePage(options: InvoiceQueryOptions & { page?: number; pageSize?: number } = {}): Promise<PaginatedResult<InvoiceRecord>> {
  const page = Math.max(1, Math.floor(options.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(options.pageSize ?? 50)));

  if (!isDatabaseConfigured()) {
    const filtered = filterDemoInvoices(demoInvoices, options);
    return paginateRecords(filtered, page, pageSize);
  }

  const database = getDatabase();
  const allocationTotals = invoiceAllocationTotals(database);
  const filter = invoiceWhere(options, allocationTotals);
  const rows = await database
    .select({
      invoice: invoices,
      paidPaisa: sql<number>`coalesce(${allocationTotals.paidPaisa}, 0)`.mapWith(Number),
      totalCount: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(invoices)
    .leftJoin(allocationTotals, eq(allocationTotals.invoiceId, invoices.id))
    .where(filter)
    .orderBy(desc(invoices.invoiceDate), desc(invoices.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const totalRecords = rows[0]?.totalCount ?? 0;

  return {
    records: rows.map(({ invoice, paidPaisa }) => toInvoiceRecord(invoice, [], paidPaisa > 0 ? [{ amount_paisa: paidPaisa }] : [])),
    page,
    page_size: pageSize,
    total_records: totalRecords,
    total_pages: Math.max(1, Math.ceil(totalRecords / pageSize)),
  };
}

export async function getInvoicesForExport(options: InvoiceQueryOptions = {}): Promise<InvoiceRecord[]> {
  if (!isDatabaseConfigured()) return filterDemoInvoices(demoInvoices, options);
  const database = getDatabase();
  const allocationTotals = invoiceAllocationTotals(database);
  const rows = await database
    .select({ invoice: invoices, paidPaisa: sql<number>`coalesce(${allocationTotals.paidPaisa}, 0)`.mapWith(Number) })
    .from(invoices)
    .leftJoin(allocationTotals, eq(allocationTotals.invoiceId, invoices.id))
    .where(invoiceWhere(options, allocationTotals))
    .orderBy(desc(invoices.invoiceDate), desc(invoices.createdAt));
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
  if (!isDatabaseConfigured()) {
    return isDemoModeEnabled() ? demoInvoices.filter((invoice) => invoice.status === "issued" && paidAmount(invoice) < invoice.total_paisa) : [];
  }
  const database = getDatabase();
  const allocationTotals = invoiceAllocationTotals(database);
  const rows = await database
    .select({ invoice: invoices, paidPaisa: sql<number>`coalesce(${allocationTotals.paidPaisa}, 0)`.mapWith(Number) })
    .from(invoices)
    .leftJoin(allocationTotals, eq(allocationTotals.invoiceId, invoices.id))
    .where(and(eq(invoices.status, "issued"), sql`coalesce(${allocationTotals.paidPaisa}, 0) < ${invoices.totalPaisa}`))
    .orderBy(desc(invoices.invoiceDate), desc(invoices.createdAt));
  return rows.map(({ invoice, paidPaisa }) => toInvoiceRecord(invoice, [], paidPaisa > 0 ? [{ amount_paisa: paidPaisa }] : []));
}

export async function getPaymentPage(options: PaymentQueryOptions & { page?: number; pageSize?: number } = {}): Promise<PaginatedResult<PaymentRecord>> {
  const page = Math.max(1, Math.floor(options.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(options.pageSize ?? 50)));
  if (!isDatabaseConfigured()) return paginateRecords(isDemoModeEnabled() ? filterDemoPayments(demoPayments, options) : [], page, pageSize);

  const database = getDatabase();
  const rows = await database.select({
      payment: payments,
      totalCount: sql<number>`count(*) over()`.mapWith(Number),
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
      .where(paymentWhere(options))
      .groupBy(payments.id)
      .orderBy(desc(payments.paymentDate), desc(payments.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
  const totalRecords = rows[0]?.totalCount ?? 0;

  return {
    records: rows.map(({ payment, allocations }) => toPaymentRecord(payment, allocations)),
    page,
    page_size: pageSize,
    total_records: totalRecords,
    total_pages: Math.max(1, Math.ceil(totalRecords / pageSize)),
  };
}

export async function getPaymentsForExport(options: PaymentQueryOptions = {}): Promise<PaymentRecord[]> {
  if (!isDatabaseConfigured()) return isDemoModeEnabled() ? filterDemoPayments(demoPayments, options) : [];
  const rows = await getDatabase().select({
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
    .where(paymentWhere(options))
    .groupBy(payments.id)
    .orderBy(desc(payments.paymentDate), desc(payments.createdAt));
  return rows.map(({ payment, allocations }) => toPaymentRecord(payment, allocations));
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
  const rows = await getDatabase()
    .select()
    .from(products)
    .where(options.activeOnly ? eq(products.isActive, true) : undefined)
    .orderBy(asc(products.articleName));
  return rows.map((product) => ({
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

export async function getCustomers(options: { activeOnly?: boolean } = {}): Promise<CustomerRecord[]> {
  if (!isDatabaseConfigured()) return isDemoModeEnabled() ? [{
    id: "00000000-0000-4000-8000-000000000010",
    name: "Metro Cash & Carry Pakistan (Pvt.) Ltd",
    city: "",
    is_active: true,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
  }] : [];
  const rows = await getDatabase()
    .select()
    .from(customers)
    .where(options.activeOnly ? eq(customers.isActive, true) : undefined)
    .orderBy(asc(customers.name), asc(customers.city));
  return rows.map((customer) => ({
    id: customer.id,
    name: customer.name,
    city: customer.city,
    is_active: customer.isActive,
    created_at: customer.createdAt,
    updated_at: customer.updatedAt,
  }));
}

export function isDemoMode() {
  return isDemoModeEnabled();
}

function toInvoiceRecord(row: typeof invoices.$inferSelect, items: InvoiceItemRecord[], allocations: { amount_paisa: number }[]): InvoiceRecord {
  return {
    id: row.id,
    invoice_number: row.invoiceNumber,
    customer_id: row.customerId,
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

function toPaymentRecord(
  payment: typeof payments.$inferSelect,
  allocations: { amount_paisa: number; invoice_number: string; store_name: string }[],
): PaymentRecord {
  return {
    id: payment.id,
    customer_id: payment.customerId,
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
  };
}

function paginateRecords<T>(records: T[], page: number, pageSize: number): PaginatedResult<T> {
  const totalRecords = records.length;
  return {
    records: records.slice((page - 1) * pageSize, page * pageSize),
    page,
    page_size: pageSize,
    total_records: totalRecords,
    total_pages: Math.max(1, Math.ceil(totalRecords / pageSize)),
  };
}
