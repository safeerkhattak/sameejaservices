import Link from "next/link";
import { ArrowUpRight, FilePlus2 } from "lucide-react";
import { getCustomers, getInvoicePage, effectiveStatus, paidAmount } from "@/lib/data";
import { formatPkr } from "@/lib/money";
import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RegisterPagination } from "@/components/register-pagination";
import { requireMember } from "@/lib/authz";
import { RegisterFilters } from "@/components/register-filters";
import { filterParams, parseInvoiceRegisterFilters } from "@/lib/register-filters";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const filters = parseInvoiceRegisterFilters(query);
  const requestedPage = Number.parseInt(Array.isArray(query.page) ? query.page[0] ?? "1" : query.page ?? "1", 10);
  const [, invoicePage, customers] = await Promise.all([
    requireMember("/invoices"),
    getInvoicePage({ ...filters, page: Number.isFinite(requestedPage) ? requestedPage : 1 }),
    getCustomers(),
  ]);
  const invoices = invoicePage.records;
  const activeFilters = filterParams(filters);
  const hasFilters = Object.keys(activeFilters).length > 0;
  return (
    <div className="mx-auto w-full max-w-[1480px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <PageHeading
        eyebrow="Invoice register"
        title="Invoices"
        description="Search, filter and export every submitted draft, issued invoice and remaining balance."
        actions={<Button asChild className="h-11 rounded-xl bg-[#2b7a78] px-4 font-semibold text-white hover:bg-[#246b69]"><Link href="/invoices/new"><FilePlus2 />New invoice</Link></Button>}
      />
      <RegisterFilters kind="invoices" filters={filters} customers={customers} totalRecords={invoicePage.total_records} />
      <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,35,55,.04)]">
        {invoices.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <p className="font-bold text-[#102a43]">{hasFilters ? "No invoices match these filters" : "No invoices yet"}</p>
            <p className="mt-1 text-sm text-slate-500">{hasFilters ? "Change the date, customer, status or search text and try again." : "Create the first invoice draft to begin tracking."}</p>
            <Button asChild className="mt-5 rounded-xl bg-[#2b7a78] hover:bg-[#246b69]"><Link href={hasFilters ? "/invoices" : "/invoices/new"}>{hasFilters ? "Clear filters" : <><FilePlus2 />Create invoice</>}</Link></Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/70 text-xs uppercase tracking-[0.08em] text-slate-500 hover:bg-slate-50/70">
                <TableHead className="px-6">Invoice</TableHead><TableHead>Store</TableHead><TableHead>PO number</TableHead><TableHead>Total</TableHead><TableHead>Received</TableHead><TableHead>Balance</TableHead><TableHead>Status</TableHead><TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => {
                const received = paidAmount(invoice);
                const balance = invoice.status === "cancelled" ? 0 : Math.max(0, invoice.total_paisa - received);
                return (
                  <TableRow key={invoice.id} className="hover:bg-[#f8fbfb]">
                    <TableCell className="px-6 py-4"><p className="font-bold text-[#102a43]">INV-{invoice.invoice_number}</p><p className="mt-0.5 text-xs text-slate-500">{formatDate(invoice.invoice_date)}</p></TableCell>
                    <TableCell className="font-medium">Metro {invoice.store_name}</TableCell>
                    <TableCell className="text-slate-600">{invoice.po_number || "—"}</TableCell>
                    <TableCell className="font-semibold tabular-nums">{formatPkr(invoice.total_paisa)}</TableCell>
                    <TableCell className="tabular-nums text-slate-600">{formatPkr(received)}</TableCell>
                    <TableCell className="font-bold tabular-nums text-[#102a43]">{formatPkr(balance)}</TableCell>
                    <TableCell><StatusBadge status={effectiveStatus(invoice)} /></TableCell>
                    <TableCell className="pr-6 text-right"><Button asChild variant="ghost" size="icon"><Link href={"/invoices/" + invoice.id} aria-label={"Open invoice " + invoice.invoice_number}><ArrowUpRight /></Link></Button></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        <RegisterPagination
          basePath="/invoices"
          page={invoicePage.page}
          pageSize={invoicePage.page_size}
          totalPages={invoicePage.total_pages}
          totalRecords={invoicePage.total_records}
          params={activeFilters}
        />
      </section>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PK", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value + "T00:00:00"));
}
