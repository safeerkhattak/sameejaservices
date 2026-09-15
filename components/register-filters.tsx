import Link from "next/link";
import { Download, FileSpreadsheet, Filter, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { customerLabel } from "@/lib/customer-label";
import { filterParams, type InvoiceRegisterFilters, type PaymentRegisterFilters } from "@/lib/register-filters";

type CustomerOption = { id: string; name: string; city: string };

export function RegisterFilters({ kind, filters, customers, totalRecords }: {
  kind: "invoices" | "payments";
  filters: InvoiceRegisterFilters | PaymentRegisterFilters;
  customers: CustomerOption[];
  totalRecords: number;
}) {
  const activeParams = filterParams(filters);
  const activeCount = Object.keys(activeParams).length;
  const exportHref = (format: "xlsx" | "pdf") => {
    const params = new URLSearchParams(activeParams);
    params.set("format", format);
    return `/api/exports/${kind}?${params.toString()}`;
  };

  return (
    <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,35,55,.04)] sm:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <form action={`/${kind}`} method="get" className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_160px_160px_minmax(210px,1fr)_180px_auto]">
          <div><Label htmlFor={`${kind}-search`} className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Search</Label><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input id={`${kind}-search`} name="q" defaultValue={filters.q} className="h-11 rounded-xl pl-10" placeholder={kind === "invoices" ? "Invoice, customer, store or PO" : "Customer, reference or invoice"} /></div></div>
          <div><Label htmlFor={`${kind}-from`} className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">From date</Label><Input id={`${kind}-from`} name="from" type="date" defaultValue={filters.from} max={filters.to || undefined} className="h-11 rounded-xl" /></div>
          <div><Label htmlFor={`${kind}-to`} className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">To date</Label><Input id={`${kind}-to`} name="to" type="date" defaultValue={filters.to} min={filters.from || undefined} className="h-11 rounded-xl" /></div>
          <div><Label htmlFor={`${kind}-customer`} className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Customer</Label><select id={`${kind}-customer`} name="customerId" defaultValue={filters.customerId} className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#2b7a78] focus:ring-4 focus:ring-[#2b7a78]/10"><option value="">All customers</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customerLabel(customer, customers)}</option>)}</select></div>
          {kind === "invoices" ? <div><Label htmlFor="invoice-status" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</Label><select id="invoice-status" name="status" defaultValue={(filters as InvoiceRegisterFilters).status} className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#2b7a78] focus:ring-4 focus:ring-[#2b7a78]/10"><option value="">All statuses</option><option value="pending_review">Awaiting review</option><option value="unpaid">Unpaid</option><option value="partially_paid">Partially paid</option><option value="paid">Paid</option><option value="cancelled">Cancelled</option></select></div> : <div className="hidden xl:block" />}
          <Button type="submit" className="h-11 self-end rounded-xl bg-[#2b7a78] font-semibold hover:bg-[#246b69]"><Filter />Apply</Button>
        </form>

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          {activeCount > 0 && <Button asChild variant="ghost" className="h-10 rounded-xl text-slate-500"><Link href={`/${kind}`} aria-label={`Clear ${activeCount} active filters`}><RotateCcw />Clear filters</Link></Button>}
          {totalRecords > 0 ? <><Button asChild variant="outline" className="h-10 rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50"><a href={exportHref("xlsx")}><FileSpreadsheet />Excel</a></Button><Button asChild variant="outline" className="h-10 rounded-xl border-slate-300 text-[#102a43]"><a href={exportHref("pdf")}><Download />PDF</a></Button></> : <><Button variant="outline" className="h-10 rounded-xl" disabled><FileSpreadsheet />Excel</Button><Button variant="outline" className="h-10 rounded-xl" disabled><Download />PDF</Button></>}
        </div>
      </div>
      <p className="mt-4 text-xs text-slate-500">{totalRecords.toLocaleString("en-PK")} matching {totalRecords === 1 ? "record" : "records"}. Exports include every matching record, not only this page.</p>
    </section>
  );
}
