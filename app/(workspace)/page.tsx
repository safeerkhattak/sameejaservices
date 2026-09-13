import Link from "next/link";
import { ArrowUpRight, Banknote, CircleDollarSign, ClipboardList, FilePlus2, ReceiptText } from "lucide-react";
import { requireMember } from "@/lib/authz";
import { effectiveStatus, getInvoices, getPayments, isDemoMode, paidAmount } from "@/lib/data";
import { formatPkr } from "@/lib/money";
import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [member, invoices, payments] = await Promise.all([
    requireMember("/"),
    getInvoices(),
    getPayments(),
  ]);
  const issued = invoices.filter((invoice) => invoice.status === "issued");
  const totalInvoiced = issued.reduce((sum, invoice) => sum + Number(invoice.total_paisa), 0);
  const totalReceived = payments.reduce((sum, payment) => sum + Number(payment.amount_paisa), 0);
  const outstanding = issued.reduce(
    (sum, invoice) => sum + Math.max(0, Number(invoice.total_paisa) - paidAmount(invoice)),
    0,
  );
  const awaitingReview = invoices.filter((invoice) => invoice.status === "pending_review").length;
  const collectionPercent = totalInvoiced > 0 ? Math.min(100, (totalReceived / totalInvoiced) * 100) : 0;
  const attention = invoices
    .filter((invoice) => invoice.status === "pending_review" || (invoice.status === "issued" && paidAmount(invoice) < invoice.total_paisa))
    .slice(0, 6);
  const today = new Intl.DateTimeFormat("en-PK", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date());

  return (
    <div className="mx-auto w-full max-w-[1480px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      {isDemoMode() && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky-500" />
          <p><strong>Preview data is active.</strong> Connect the Supabase project to start saving real invoices and payments.</p>
        </div>
      )}
      <PageHeading
        eyebrow={today}
        title="Business overview"
        description={member.role === "owner" ? "Every invoice, payment and remaining balance—clear at a glance." : "Create a new invoice draft and follow its review status."}
        actions={
          <>
            {member.role === "owner" && (
              <Button asChild variant="outline" className="h-11 rounded-xl border-slate-300 bg-white px-4 font-semibold text-[#102a43]">
                <Link href="/payments/new"><Banknote />Record payment</Link>
              </Button>
            )}
            <Button asChild className="h-11 rounded-xl bg-[#2b7a78] px-4 font-semibold text-white shadow-[0_10px_28px_rgba(43,122,120,.22)] hover:bg-[#246b69]">
              <Link href="/invoices/new"><FilePlus2 />New invoice</Link>
            </Button>
          </>
        }
      />

      <section className={"mt-8 grid gap-4 sm:grid-cols-2 " + (member.role === "owner" ? "xl:grid-cols-4" : "xl:grid-cols-2")} aria-label="Account summary">
        {member.role === "owner" && (
          <>
            <MetricCard label="Outstanding" value={formatPkr(outstanding)} hint={"Across " + issued.filter((invoice) => paidAmount(invoice) < invoice.total_paisa).length + " invoices"} icon={CircleDollarSign} accent />
            <MetricCard label="Total invoiced" value={formatPkr(totalInvoiced)} hint={issued.length + " issued invoices"} icon={ReceiptText} />
            <MetricCard label="Payments received" value={formatPkr(totalReceived)} hint={collectionPercent.toFixed(1) + "% collected"} icon={Banknote} />
          </>
        )}
        <MetricCard label="Awaiting review" value={String(awaitingReview)} hint="Submitted drafts" icon={ClipboardList} />
      </section>

      <div className={"mt-6 grid gap-6 " + (member.role === "owner" ? "xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,.75fr)]" : "")}>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,35,55,.05)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-[#102a43]">Invoices needing attention</h2>
              <p className="mt-1 text-sm text-slate-500">Review a draft or follow up on a remaining balance.</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-[#2b7a78]">
              <Link href="/invoices">View all<ArrowUpRight /></Link>
            </Button>
          </div>
          {attention.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="font-semibold text-[#102a43]">Nothing needs attention</p>
              <p className="mt-1 text-sm text-slate-500">New drafts and unpaid invoices will appear here.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70 text-xs uppercase tracking-[0.08em] text-slate-500 hover:bg-slate-50/70">
                  <TableHead className="px-6">Invoice</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {attention.map((invoice) => {
                  const balance = Math.max(0, invoice.total_paisa - paidAmount(invoice));
                  return (
                    <TableRow key={invoice.id} className="hover:bg-[#f8fbfb]">
                      <TableCell className="px-6 py-4">
                        <p className="font-bold text-[#102a43]">INV-{invoice.invoice_number}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{formatDate(invoice.invoice_date)}</p>
                      </TableCell>
                      <TableCell className="font-medium">Metro {invoice.store_name}</TableCell>
                      <TableCell className="font-semibold tabular-nums">{formatPkr(invoice.total_paisa)}</TableCell>
                      <TableCell className="font-bold tabular-nums text-[#102a43]">{formatPkr(balance)}</TableCell>
                      <TableCell><StatusBadge status={effectiveStatus(invoice)} /></TableCell>
                      <TableCell className="pr-6 text-right">
                        <Button asChild variant="ghost" size="icon">
                          <Link href={"/invoices/" + invoice.id} aria-label={"Open invoice " + invoice.invoice_number}><ArrowUpRight /></Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </section>

        {member.role === "owner" && (
          <aside className="rounded-2xl bg-[#102a43] p-6 text-white shadow-[0_16px_40px_rgba(16,42,67,.18)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Collection progress</p>
            <div className="mt-5 flex items-end justify-between gap-4">
              <div><p className="text-3xl font-bold tracking-[-0.04em]">{collectionPercent.toFixed(1)}%</p><p className="mt-1 text-sm text-slate-300">of issued invoices received</p></div>
              <div className="grid h-16 w-16 place-items-center rounded-full border-[7px] border-[#f5b942] border-r-white/15 text-xs font-bold">PKR</div>
            </div>
            <Progress value={collectionPercent} className="mt-7 h-2 bg-white/10 [&>div]:bg-[#f5b942]" />
            <dl className="mt-7 space-y-4 border-t border-white/10 pt-5">
              <SummaryRow label="Fully paid" value={issued.filter((invoice) => effectiveStatus(invoice) === "paid").length} />
              <SummaryRow label="Partially paid" value={issued.filter((invoice) => effectiveStatus(invoice) === "partially_paid").length} highlight />
              <SummaryRow label="Unpaid" value={issued.filter((invoice) => effectiveStatus(invoice) === "unpaid").length} />
            </dl>
            <Button asChild className="mt-7 h-11 w-full rounded-xl bg-white font-bold text-[#102a43] hover:bg-slate-100">
              <Link href="/payments/new">Allocate a payment<ArrowUpRight /></Link>
            </Button>
          </aside>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, hint, icon: Icon, accent = false }: {
  label: string;
  value: string;
  hint: string;
  icon: typeof ReceiptText;
  accent?: boolean;
}) {
  return (
    <article className={"relative overflow-hidden rounded-2xl border bg-white p-5 shadow-[0_10px_30px_rgba(15,35,55,.04)] " + (accent ? "border-[#2b7a78]/30" : "border-slate-200")}>
      {accent && <span className="absolute inset-y-0 left-0 w-1 bg-[#2b7a78]" />}
      <div className="flex items-start justify-between">
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <span className={"rounded-xl p-2.5 " + (accent ? "bg-[#e7f3f2] text-[#2b7a78]" : "bg-slate-100 text-slate-500")}><Icon className="h-[18px] w-[18px]" /></span>
      </div>
      <p className="mt-5 text-[1.65rem] font-bold tracking-[-0.04em] text-[#102a43]">{value}</p>
      <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
    </article>
  );
}

function SummaryRow({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return <div className="flex items-center justify-between"><dt className="text-sm text-slate-300">{label}</dt><dd className={"text-sm font-bold " + (highlight ? "text-[#f5b942]" : "")}>{value} invoices</dd></div>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PK", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value + "T00:00:00"));
}
