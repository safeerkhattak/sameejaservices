import Link from "next/link";
import { Banknote } from "lucide-react";
import { requireOwner } from "@/lib/authz";
import { getPayments } from "@/lib/data";
import { formatPkr } from "@/lib/money";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  await requireOwner("/payments");
  const payments = await getPayments();
  return (
    <div className="mx-auto w-full max-w-[1480px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <PageHeading eyebrow="Payment register" title="Payments" description="Every received payment and its manually selected invoice allocations." actions={<Button asChild className="h-11 rounded-xl bg-[#2b7a78] hover:bg-[#246b69]"><Link href="/payments/new"><Banknote />Record payment</Link></Button>} />
      <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,35,55,.04)]">
        {payments.length === 0 ? <div className="px-6 py-20 text-center"><p className="font-bold text-[#102a43]">No payments recorded</p><p className="mt-1 text-sm text-slate-500">Payments will appear here after the owner allocates them.</p></div> : (
          <Table>
            <TableHeader><TableRow className="bg-slate-50/70 hover:bg-slate-50/70"><TableHead className="px-6">Date</TableHead><TableHead>Customer</TableHead><TableHead>Reference</TableHead><TableHead>Allocated invoices</TableHead><TableHead className="pr-6 text-right">Amount</TableHead></TableRow></TableHeader>
            <TableBody>{payments.map((payment) => <TableRow key={payment.id}><TableCell className="px-6 py-4 font-medium">{formatDate(payment.payment_date)}</TableCell><TableCell>{payment.customer_name}</TableCell><TableCell className="text-slate-600">{payment.reference_number || "—"}</TableCell><TableCell><div className="flex flex-wrap gap-1.5">{(payment.payment_allocations ?? []).map((allocation, index) => <span key={index} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">INV-{allocation.invoices?.invoice_number ?? "—"} · {formatPkr(allocation.amount_paisa)}</span>)}</div></TableCell><TableCell className="pr-6 text-right text-base font-bold tabular-nums text-[#102a43]">{formatPkr(payment.amount_paisa)}</TableCell></TableRow>)}</TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}

function formatDate(value: string) { return new Intl.DateTimeFormat("en-PK", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value + "T00:00:00")); }
