"use client";

import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { AlertCircle, Banknote, CheckCircle2, Loader2, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { formatPkr } from "@/lib/money";

type OpenInvoice = { id: string; invoiceNumber: string; storeName: string; invoiceDate: string; totalPaisa: number; paidPaisa: number; balancePaisa: number; customerName: string };
type FormValues = { customerName: string; paymentDate: string; amount: string; referenceNumber: string; notes: string };

const paymentSchema = z.object({
  customerName: z.string().trim().min(1),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.string().refine((value) => Number(value) > 0),
  referenceNumber: z.string(),
  notes: z.string(),
});

export function PaymentForm({ invoices, demoMode }: { invoices: OpenInvoice[]; demoMode: boolean }) {
  const router = useRouter();
  const customers = Array.from(new Set(invoices.map((invoice) => invoice.customerName)));
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<FormValues>({
    defaultValues: {
      customerName: customers[0] ?? "Metro Cash & Carry Pakistan (Pvt.) Ltd",
      paymentDate: new Date().toISOString().slice(0, 10),
      amount: "",
      referenceNumber: "",
      notes: "",
    },
  });
  const customerName = useWatch({ control: form.control, name: "customerName" });
  const amount = useWatch({ control: form.control, name: "amount" });
  const visibleInvoices = invoices.filter((invoice) => invoice.customerName === customerName);
  const paymentPaisa = Math.round((Number(amount) || 0) * 100);
  const allocatedPaisa = useMemo(
    () => Object.entries(allocations).reduce((sum, [id, value]) => sum + (selected[id] ? Math.round((Number(value) || 0) * 100) : 0), 0),
    [allocations, selected],
  );
  const remainingPaisa = paymentPaisa - allocatedPaisa;
  const canSubmit = paymentPaisa > 0 && remainingPaisa === 0 && Object.values(selected).some(Boolean);

  async function submit(values: FormValues) {
    const parsed = paymentSchema.safeParse(values);
    if (!parsed.success || !canSubmit) {
      toast.error("Enter the payment and manually allocate its full amount.");
      return;
    }
    if (demoMode) {
      toast.info("Connect Supabase to save this payment.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parsed.data,
          allocations: visibleInvoices
            .filter((invoice) => selected[invoice.id])
            .map((invoice) => ({ invoiceId: invoice.id, amount: allocations[invoice.id] })),
        }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Payment could not be saved.");
      toast.success("Payment recorded and allocated.");
      router.push("/payments");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payment could not be saved.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} className="mt-7 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
      <div className="min-w-0 space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,35,55,.04)] sm:p-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e7f3f2] text-[#2b7a78]"><Banknote className="h-5 w-5" /></span>
            <div><h2 className="font-bold text-[#102a43]">Payment details</h2><p className="mt-0.5 text-sm text-slate-500">Record exactly what was received from the customer.</p></div>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field label="Customer">
              <Select value={customerName} onValueChange={(value) => { form.setValue("customerName", value); setSelected({}); setAllocations({}); }}>
                <SelectTrigger className="h-11 w-full rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{(customers.length ? customers : [customerName]).map((customer) => <SelectItem key={customer} value={customer}>{customer}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Payment date"><Input type="date" {...form.register("paymentDate")} className="h-11 rounded-xl" /></Field>
            <Field label="Amount received"><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">Rs</span><Input inputMode="decimal" {...form.register("amount")} className="h-11 rounded-xl pl-10 text-right text-base font-semibold tabular-nums" placeholder="0" /></div></Field>
            <Field label="Reference number"><Input {...form.register("referenceNumber")} className="h-11 rounded-xl" placeholder="Bank transfer or cheque reference" /></Field>
            <Field label="Notes" className="sm:col-span-2"><Textarea {...form.register("notes")} className="min-h-20 rounded-xl" placeholder="Optional payment note" /></Field>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,35,55,.04)]">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6"><h2 className="font-bold text-[#102a43]">Choose invoices manually</h2><p className="mt-1 text-sm text-slate-500">Select only the invoices Metro is paying, then enter the amount for each.</p></div>
          {visibleInvoices.length === 0 ? (
            <div className="px-6 py-14 text-center"><p className="font-semibold text-[#102a43]">No outstanding issued invoices</p><p className="mt-1 text-sm text-slate-500">Approved invoices with a balance will appear here.</p></div>
          ) : (
            <Table>
              <TableHeader><TableRow className="bg-slate-50/70 hover:bg-slate-50/70"><TableHead className="w-14 px-6" /><TableHead>Invoice</TableHead><TableHead>Store</TableHead><TableHead>Total</TableHead><TableHead>Balance</TableHead><TableHead className="min-w-[180px] pr-6">Allocate</TableHead></TableRow></TableHeader>
              <TableBody>{visibleInvoices.map((invoice) => {
                const isSelected = Boolean(selected[invoice.id]);
                const allocationPaisa = Math.round((Number(allocations[invoice.id]) || 0) * 100);
                const tooHigh = allocationPaisa > invoice.balancePaisa;
                return (
                  <TableRow key={invoice.id} data-state={isSelected ? "selected" : undefined}>
                    <TableCell className="px-6"><Checkbox checked={isSelected} onCheckedChange={(checked) => setSelected((current) => ({ ...current, [invoice.id]: checked === true }))} aria-label={"Select invoice " + invoice.invoiceNumber} /></TableCell>
                    <TableCell><p className="font-bold text-[#102a43]">INV-{invoice.invoiceNumber}</p><p className="text-xs text-slate-500">{formatDate(invoice.invoiceDate)}</p></TableCell>
                    <TableCell className="font-medium">Metro {invoice.storeName}</TableCell>
                    <TableCell className="tabular-nums">{formatPkr(invoice.totalPaisa)}</TableCell>
                    <TableCell className="font-bold tabular-nums text-[#102a43]">{formatPkr(invoice.balancePaisa)}</TableCell>
                    <TableCell className="pr-6"><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">Rs</span><Input disabled={!isSelected} value={allocations[invoice.id] ?? ""} onChange={(event) => setAllocations((current) => ({ ...current, [invoice.id]: event.target.value }))} inputMode="decimal" className={"h-10 rounded-xl pl-9 text-right tabular-nums " + (tooHigh ? "border-rose-400 focus-visible:ring-rose-300" : "")} placeholder="0" /></div>{tooHigh && <p className="mt-1 text-xs font-medium text-rose-600">Exceeds balance</p>}</TableCell>
                  </TableRow>
                );
              })}</TableBody>
            </Table>
          )}
        </section>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-[96px] xl:self-start">
        <div className="rounded-2xl bg-[#102a43] p-6 text-white shadow-[0_16px_40px_rgba(16,42,67,.18)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Allocation check</p>
          <dl className="mt-5 space-y-4"><AmountRow label="Payment received" value={paymentPaisa} /><AmountRow label="Allocated" value={allocatedPaisa} /><div className="border-t border-white/10 pt-4"><AmountRow label={remainingPaisa < 0 ? "Over-allocated" : "Left to allocate"} value={Math.abs(remainingPaisa)} highlight={remainingPaisa !== 0} /></div></dl>
          <div className="mt-6 flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[#f5b942]" /><p className="text-xs leading-5 text-slate-300">Nothing is allocated automatically. Your chosen invoices and amounts are saved exactly as entered.</p></div>
          {remainingPaisa !== 0 && paymentPaisa > 0 && <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-400/10 p-3 text-xs text-amber-200"><AlertCircle className="h-4 w-4 shrink-0" />The full payment must be allocated before saving.</div>}
          <Button type="submit" disabled={!canSubmit || submitting || demoMode} aria-busy={submitting} className="mt-6 h-12 w-full rounded-xl bg-[#f5b942] font-bold text-[#102a43] hover:bg-[#ffc955] disabled:opacity-60">{submitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}{submitting ? "Recording payment…" : demoMode ? "Connect Supabase to save" : "Record payment"}</Button>
        </div>
      </aside>
    </form>
  );
}

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) { return <div className={className}><Label className="mb-2 block text-sm font-semibold text-slate-700">{label}</Label>{children}</div>; }
function AmountRow({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) { return <div className="flex items-center justify-between gap-4"><dt className="text-sm text-slate-300">{label}</dt><dd className={"font-bold tabular-nums " + (highlight ? "text-[#f5b942]" : "")}>{formatPkr(value)}</dd></div>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-PK", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value + "T00:00:00")); }
