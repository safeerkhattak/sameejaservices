import Link from "next/link";
import { Banknote } from "lucide-react";
import { requireOwner } from "@/lib/authz";
import { getCustomers, getPaymentPage } from "@/lib/data";
import { formatPkr } from "@/lib/money";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RegisterPagination } from "@/components/register-pagination";
import { RegisterFilters } from "@/components/register-filters";
import { filterParams, parsePaymentRegisterFilters } from "@/lib/register-filters";

export const dynamic = "force-dynamic";

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const filters = parsePaymentRegisterFilters(query);
  const requestedPage = Number.parseInt(Array.isArray(query.page) ? query.page[0] ?? "1" : query.page ?? "1", 10);
  const [, paymentPage, customers] = await Promise.all([
    requireOwner("/payments"),
    getPaymentPage({ ...filters, page: Number.isFinite(requestedPage) ? requestedPage : 1 }),
    getCustomers(),
  ]);
  const payments = paymentPage.records;
  const activeFilters = filterParams(filters);
  const hasFilters = Object.keys(activeFilters).length > 0;
  return (
    <div className="mx-auto w-full max-w-[1480px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <PageHeading eyebrow="Payment register" title="Payments" description="Every received payment and its manually selected invoice allocations." actions={<Button asChild className="h-11 rounded-xl bg-[#2b7a78] hover:bg-[#246b69]"><Link href="/payments/new"><Banknote />Record payment</Link></Button>} />
      <RegisterFilters kind="payments" filters={filters} customers={customers} totalRecords={paymentPage.total_records} />
      <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,35,55,.04)]">
        {payments.length === 0 ? <div className="px-6 py-20 text-center"><p className="font-bold text-[#102a43]">{hasFilters ? "No payments match these filters" : "No payments recorded"}</p><p className="mt-1 text-sm text-slate-500">{hasFilters ? "Change the date, customer or search text and try again." : "Payments will appear here after the owner allocates them."}</p>{hasFilters && <Button asChild variant="outline" className="mt-5 rounded-xl"><Link href="/payments">Clear filters</Link></Button>}</div> : (
          <Table>
            <TableHeader><TableRow className="bg-slate-50/70 hover:bg-slate-50/70"><TableHead className="px-6">Date</TableHead><TableHead>Customer</TableHead><TableHead>Reference</TableHead><TableHead>Allocated invoices</TableHead><TableHead className="pr-6 text-right">Amount</TableHead></TableRow></TableHeader>
            <TableBody>{payments.map((payment) => <TableRow key={payment.id}><TableCell className="px-6 py-4 font-medium">{formatDate(payment.payment_date)}</TableCell><TableCell>{payment.customer_name}</TableCell><TableCell className="text-slate-600">{payment.reference_number || "—"}</TableCell><TableCell><div className="flex flex-wrap gap-1.5">{(payment.payment_allocations ?? []).map((allocation, index) => <span key={index} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">INV-{allocation.invoices?.invoice_number ?? "—"} · {formatPkr(allocation.amount_paisa)}</span>)}</div></TableCell><TableCell className="pr-6 text-right text-base font-bold tabular-nums text-[#102a43]">{formatPkr(payment.amount_paisa)}</TableCell></TableRow>)}</TableBody>
          </Table>
        )}
        <RegisterPagination
          basePath="/payments"
          page={paymentPage.page}
          pageSize={paymentPage.page_size}
          totalPages={paymentPage.total_pages}
          totalRecords={paymentPage.total_records}
          params={activeFilters}
        />
      </section>
    </div>
  );
}

function formatDate(value: string) { return new Intl.DateTimeFormat("en-PK", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value + "T00:00:00")); }
