import { notFound } from "next/navigation";
import { getCurrentMember } from "@/lib/authz";
import { effectiveStatus, getInvoice, isDemoMode, paidAmount } from "@/lib/data";
import { formatKg, formatPkr } from "@/lib/money";
import { InvoiceActions } from "@/components/invoice-actions";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [member, invoice] = await Promise.all([getCurrentMember("/invoices/" + id), getInvoice(id)]);
  if (!invoice) notFound();
  const received = paidAmount(invoice);
  const balance = invoice.status === "cancelled" ? 0 : Math.max(0, invoice.total_paisa - received);
  const items = [...(invoice.invoice_items ?? [])].sort((a, b) => a.position - b.position);

  return (
    <div className="invoice-screen mx-auto w-full max-w-[1280px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <div className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between print:hidden">
        <div><div className="mb-2"><StatusBadge status={effectiveStatus(invoice)} /></div><h1 className="text-3xl font-bold tracking-[-0.045em] text-[#102a43]">Invoice {invoice.invoice_number}</h1><p className="mt-2 text-sm text-slate-500">Metro {invoice.store_name} · {formatDate(invoice.invoice_date)}</p></div>
        <InvoiceActions invoiceId={invoice.id} status={invoice.status} isOwner={member.role === "owner"} demoMode={isDemoMode()} />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3 print:hidden">
        <Summary label="Invoice total" value={formatPkr(invoice.total_paisa)} />
        <Summary label="Payments received" value={formatPkr(received)} />
        <Summary label="Remaining balance" value={formatPkr(balance)} accent={balance > 0} />
      </div>

      <article className="invoice-paper overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_50px_rgba(15,35,55,.08)]">
        <div className="flex flex-col gap-6 border-b-[3px] border-[#102a43] px-7 py-7 sm:flex-row sm:items-start sm:justify-between sm:px-10 sm:py-9">
          <div><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#102a43] text-sm font-black text-[#f5b942]">SC</span><div><h2 className="text-xl font-black tracking-[-0.035em] text-[#102a43]">SAMEEJA COMMISSION SERVICES</h2><p className="text-sm text-slate-500">Reliable supply. Clear accounts.</p></div></div><div className="mt-6 text-sm leading-6 text-slate-600"><p>Ph: 0312 6950784</p><p>kha32785@gmail.com</p></div></div>
          <div className="min-w-[240px] sm:text-right"><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#2b7a78]">Invoice</p><p className="mt-2 text-4xl font-black tracking-[-0.05em] text-[#102a43]">#{invoice.invoice_number}</p><p className="mt-2 text-sm text-slate-500">{formatDate(invoice.invoice_date)}</p></div>
        </div>

        <div className="grid gap-8 px-7 py-7 sm:grid-cols-[1fr_1.15fr] sm:px-10">
          <section><p className="invoice-label">Billed to</p><p className="mt-2 font-bold text-[#102a43]">{invoice.customer_name}</p><p className="mt-1 text-sm text-slate-500">{invoice.customer_city || "Pakistan"}</p></section>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-4 text-sm">
            <Meta label="Supplier no." value={invoice.supplier_number} /><Meta label="Store no." value={invoice.store_number} /><Meta label="Store name" value={invoice.store_name} /><Meta label="PO number" value={invoice.po_number} /><Meta label="Goods receiving no." value={invoice.goods_receiving_number} />
          </dl>
        </div>

        <div className="border-y border-slate-200">
          <Table>
            <TableHeader><TableRow className="bg-[#102a43] text-white hover:bg-[#102a43]"><TableHead className="px-7 text-white sm:px-10">MGM #</TableHead><TableHead className="text-white">Subsys #</TableHead><TableHead className="text-white">Article</TableHead><TableHead className="text-white">Unit</TableHead><TableHead className="text-right text-white">Received qty</TableHead><TableHead className="text-right text-white">Rate</TableHead><TableHead className="pr-7 text-right text-white sm:pr-10">Price</TableHead></TableRow></TableHeader>
            <TableBody>{items.map((item) => <TableRow key={item.id} className="hover:bg-transparent"><TableCell className="px-7 py-4 text-slate-600 sm:px-10">{item.mgm_code}</TableCell><TableCell className="text-slate-600">{item.subsys_code}</TableCell><TableCell className="font-semibold text-[#102a43]">{item.article_name}</TableCell><TableCell>{item.unit}</TableCell><TableCell className="text-right tabular-nums">{formatKg(item.quantity_millis)}</TableCell><TableCell className="text-right tabular-nums">{formatPkr(item.rate_paisa)}</TableCell><TableCell className="pr-7 text-right font-bold tabular-nums sm:pr-10">{formatPkr(item.total_paisa)}</TableCell></TableRow>)}</TableBody>
          </Table>
        </div>

        <div className="flex justify-end px-7 py-7 sm:px-10">
          <dl className="w-full max-w-sm space-y-3 text-sm">
            <div className="flex justify-between text-slate-500"><dt>Payments received</dt><dd>{formatPkr(received)}</dd></div>
            <div className="flex justify-between border-t border-slate-200 pt-4 text-lg font-black text-[#102a43]"><dt>Invoice total</dt><dd>{formatPkr(invoice.total_paisa)}</dd></div>
            {balance > 0 && <div className="flex justify-between rounded-xl bg-amber-50 px-4 py-3 font-bold text-amber-800"><dt>Balance due</dt><dd>{formatPkr(balance)}</dd></div>}
          </dl>
        </div>

        <div className="grid gap-12 px-7 pb-12 pt-10 text-sm sm:grid-cols-2 sm:px-10">
          <div className="border-t border-slate-400 pt-2 text-slate-500">Received by</div>
          <div className="border-t border-slate-400 pt-2 text-slate-500">Stamp & signature</div>
        </div>
      </article>
    </div>
  );
}

function Summary({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) { return <div className={"rounded-2xl border bg-white p-5 " + (accent ? "border-amber-200" : "border-slate-200")}><p className="text-sm font-semibold text-slate-500">{label}</p><p className={"mt-2 text-xl font-bold " + (accent ? "text-amber-700" : "text-[#102a43]")}>{value}</p></div>; }
function Meta({ label, value }: { label: string; value: string }) { return <div><dt className="invoice-label">{label}</dt><dd className="mt-1 font-semibold text-[#102a43]">{value || "—"}</dd></div>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-PK", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value + "T00:00:00")); }
