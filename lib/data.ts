import { isSupabaseConfigured, supabaseRequest } from "@/lib/supabase";

export type InvoiceItemRecord = {
  id: string;
  mgm_code: string;
  subsys_code: string;
  article_name: string;
  unit: string;
  quantity_millis: number;
  rate_paisa: number;
  total_paisa: number;
  position: number;
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
      { id: "demo-1", position: 0, mgm_code: "331394", subsys_code: "322313", article_name: "Prime Whole Carcas Goat", unit: "Kg", quantity_millis: 355200, rate_paisa: 232000, total_paisa: 82406400 },
      { id: "demo-2", position: 1, mgm_code: "331397", subsys_code: "322316", article_name: "Whole FQ Veal (20-30 Kg)", unit: "Kg", quantity_millis: 60500, rate_paisa: 120000, total_paisa: 7260000 },
      { id: "demo-3", position: 2, mgm_code: "331398", subsys_code: "322317", article_name: "Whole HQ Veal (20-30 Kg)", unit: "Kg", quantity_millis: 69000, rate_paisa: 120000, total_paisa: 8280000 },
      { id: "demo-4", position: 3, mgm_code: "338287", subsys_code: "256261", article_name: "Prime Whole Carcas Lamb", unit: "Kg", quantity_millis: 11300, rate_paisa: 245000, total_paisa: 2768500 },
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
  if (!isSupabaseConfigured()) return demoInvoices;
  return supabaseRequest<InvoiceRecord[]>("invoices?select=*,invoice_items(*),payment_allocations(amount_paisa)&order=invoice_date.desc,created_at.desc&limit=200");
}

export async function getInvoice(id: string): Promise<InvoiceRecord | null> {
  if (!isSupabaseConfigured()) return demoInvoices.find((invoice) => invoice.id === id) ?? null;
  const rows = await supabaseRequest<InvoiceRecord[]>("invoices?id=eq." + encodeURIComponent(id) + "&select=*,invoice_items(*),payment_allocations(amount_paisa)&invoice_items.order=position.asc&limit=1");
  return rows[0] ?? null;
}

export async function getOpenInvoices() {
  const invoices = await getInvoices();
  return invoices.filter((invoice) => invoice.status === "issued" && paidAmount(invoice) < invoice.total_paisa);
}

export async function getPayments(): Promise<PaymentRecord[]> {
  if (!isSupabaseConfigured()) return demoPayments;
  return supabaseRequest<PaymentRecord[]>("payments?select=*,payment_allocations(amount_paisa,invoices(invoice_number,store_name))&order=payment_date.desc,created_at.desc&limit=100");
}

export async function getTeam(): Promise<{ id: string; display_name: string; email: string; role: "owner" | "staff"; created_at: string }[]> {
  if (!isSupabaseConfigured()) return [
    { id: "demo-owner", display_name: "Business Owner", email: "owner@sameeja.test", role: "owner", created_at: "2026-07-01T00:00:00Z" },
    { id: "demo-staff", display_name: "Invoice Staff", email: "staff@sameeja.test", role: "staff", created_at: "2026-07-02T00:00:00Z" },
  ];
  return supabaseRequest("app_users?select=id,display_name,email,role,created_at&order=created_at.asc");
}

export function isDemoMode() {
  return !isSupabaseConfigured();
}
