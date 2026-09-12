"use client";

import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { ArrowLeft, CheckCircle2, FileText, LockKeyhole, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { formatPkr } from "@/lib/money";

const catalog = [
  { mgm: "331394", subsys: "322313", article: "Prime Whole Carcas Goat", unit: "Kg", rate: "2320" },
  { mgm: "331395", subsys: "322314", article: "Whole Boneless FQ (Beef)", unit: "Kg", rate: "" },
  { mgm: "331396", subsys: "322315", article: "Whole Boneless HQ (Beef)", unit: "Kg", rate: "" },
  { mgm: "331397", subsys: "322316", article: "Whole FQ Veal (20-30 Kg)", unit: "Kg", rate: "1200" },
  { mgm: "331398", subsys: "322317", article: "Whole HQ Veal (20-30 Kg)", unit: "Kg", rate: "1200" },
  { mgm: "331399", subsys: "322318", article: "Whole Beef Boneless HORECA", unit: "Kg", rate: "" },
  { mgm: "331400", subsys: "322319", article: "Whole Beef FQ (CDLE)", unit: "Kg", rate: "780" },
  { mgm: "331401", subsys: "322320", article: "Veal Leg only (20-30 Kg)", unit: "Kg", rate: "" },
  { mgm: "331402", subsys: "322321", article: "Prime Whole Carcas Lamb", unit: "Kg", rate: "2450" },
  { mgm: "338287", subsys: "256261", article: "Mutton leg safi", unit: "Kg", rate: "2300" },
  { mgm: "331404", subsys: "322323", article: "Non Branded Mutton", unit: "Kg", rate: "1500" },
  { mgm: "338237", subsys: "256251", article: "Mutton Shoulder safi", unit: "Kg", rate: "" },
];

const itemSchema = z.object({
  mgmCode: z.string(),
  subsysCode: z.string(),
  articleName: z.string().min(1),
  unit: z.string().min(1),
  quantity: z.string().refine((value) => Number(value) > 0),
  rate: z.string().refine((value) => Number(value) > 0),
});

const formSchema = z.object({
  invoiceNumber: z.string().trim().min(1),
  customerName: z.string().trim().min(1),
  customerCity: z.string(),
  supplierNumber: z.string(),
  storeNumber: z.string(),
  storeName: z.string().trim().min(1),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  poNumber: z.string(),
  goodsReceivingNumber: z.string(),
  notes: z.string(),
  items: z.array(itemSchema).min(1),
});

export type InvoiceFormValues = z.infer<typeof formSchema>;

const blankItem = { mgmCode: "", subsysCode: "", articleName: "", unit: "Kg", quantity: "", rate: "" };

export function InvoiceForm({
  mode = "create",
  invoiceId,
  initialValues,
  demoMode,
}: {
  mode?: "create" | "edit";
  invoiceId?: string;
  initialValues?: InvoiceFormValues;
  demoMode: boolean;
}) {
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const form = useForm<InvoiceFormValues>({
    defaultValues: initialValues ?? {
      invoiceNumber: "",
      customerName: "Metro Cash & Carry Pakistan (Pvt.) Ltd",
      customerCity: "",
      supplierNumber: "23558",
      storeNumber: "",
      storeName: "",
      invoiceDate: today,
      poNumber: "",
      goodsReceivingNumber: "",
      notes: "",
      items: [{ ...blankItem }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const items = useWatch({ control: form.control, name: "items" }) ?? [];
  const totalPaisa = items.reduce(
    (sum, item) => sum + Math.round((Number(item.quantity) || 0) * (Number(item.rate) || 0) * 100),
    0,
  );

  async function submit(values: InvoiceFormValues) {
    const result = formSchema.safeParse(values);
    if (!result.success) {
      toast.error("Complete the invoice details and add at least one item with quantity and rate.");
      return;
    }
    if (demoMode) {
      toast.info("Connect Supabase to save this invoice.");
      return;
    }
    setSubmitting(true);
    try {
      const endpoint = mode === "edit" && invoiceId ? "/api/invoices/" + invoiceId : "/api/invoices";
      const response = await fetch(endpoint, {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      });
      const payload = await response.json() as { id?: string; error?: string };
      if (!response.ok) throw new Error(payload.error || "Invoice could not be saved.");
      toast.success(mode === "edit" ? "Invoice updated." : "Draft submitted for owner review.");
      router.push("/invoices/" + (payload.id || invoiceId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invoice could not be saved.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} className="mt-7 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,35,55,.04)] sm:p-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e7f3f2] text-[#2b7a78]"><FileText className="h-5 w-5" /></span>
            <div><h2 className="font-bold text-[#102a43]">Invoice information</h2><p className="mt-0.5 text-sm text-slate-500">Use the reference numbers provided by Metro.</p></div>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Invoice number" required><Input {...form.register("invoiceNumber")} placeholder="e.g. 172" className="h-11 rounded-xl" /></Field>
            <Field label="Invoice date" required><Input type="date" {...form.register("invoiceDate")} className="h-11 rounded-xl" /></Field>
            <Field label="Supplier number"><Input {...form.register("supplierNumber")} placeholder="23558" className="h-11 rounded-xl" /></Field>
            <Field label="Store number"><Input {...form.register("storeNumber")} placeholder="e.g. 15" className="h-11 rounded-xl" /></Field>
            <Field label="Store name" required><Input {...form.register("storeName")} placeholder="e.g. Multan" className="h-11 rounded-xl" /></Field>
            <Field label="Customer city"><Input {...form.register("customerCity")} placeholder="e.g. Lahore" className="h-11 rounded-xl" /></Field>
            <Field label="PO number"><Input {...form.register("poNumber")} placeholder="Purchase order reference" className="h-11 rounded-xl" /></Field>
            <Field label="Goods receiving number"><Input {...form.register("goodsReceivingNumber")} placeholder="Metro receiving reference" className="h-11 rounded-xl" /></Field>
            <Field label="Customer" className="sm:col-span-2 lg:col-span-1"><Input {...form.register("customerName")} className="h-11 rounded-xl" /></Field>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,35,55,.04)]">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div><h2 className="font-bold text-[#102a43]">Received articles</h2><p className="mt-0.5 text-sm text-slate-500">Choose an article, then enter received quantity and Metro rate.</p></div>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => append({ ...blankItem })}><Plus />Add article</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                <TableHead className="min-w-[250px] px-6">Article</TableHead>
                <TableHead className="min-w-[105px]">MGM #</TableHead>
                <TableHead className="min-w-[105px]">Subsys #</TableHead>
                <TableHead className="min-w-[120px]">Quantity</TableHead>
                <TableHead className="min-w-[120px]">Rate</TableHead>
                <TableHead className="min-w-[130px] text-right">Price</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field, index) => {
                const item = items[index] ?? blankItem;
                const linePaisa = Math.round((Number(item.quantity) || 0) * (Number(item.rate) || 0) * 100);
                return (
                  <TableRow key={field.id} className="align-top hover:bg-transparent">
                    <TableCell className="px-6 py-4">
                      <Select value={item.articleName || undefined} onValueChange={(name) => {
                        const product = catalog.find((entry) => entry.article === name);
                        if (!product) return;
                        form.setValue("items." + index + ".articleName" as const, product.article);
                        form.setValue("items." + index + ".mgmCode" as const, product.mgm);
                        form.setValue("items." + index + ".subsysCode" as const, product.subsys);
                        form.setValue("items." + index + ".unit" as const, product.unit);
                        if (!item.rate && product.rate) form.setValue("items." + index + ".rate" as const, product.rate);
                      }}>
                        <SelectTrigger className="h-11 w-full min-w-[230px] rounded-xl"><SelectValue placeholder="Select article" /></SelectTrigger>
                        <SelectContent>{catalog.map((product) => <SelectItem key={product.mgm} value={product.article}>{product.article}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="py-4"><Input {...form.register("items." + index + ".mgmCode" as const)} readOnly className="h-11 rounded-xl bg-slate-50" /></TableCell>
                    <TableCell className="py-4"><Input {...form.register("items." + index + ".subsysCode" as const)} readOnly className="h-11 rounded-xl bg-slate-50" /></TableCell>
                    <TableCell className="py-4"><div className="relative"><Input inputMode="decimal" {...form.register("items." + index + ".quantity" as const)} placeholder="0.000" className="h-11 rounded-xl pr-10 text-right tabular-nums" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">Kg</span></div></TableCell>
                    <TableCell className="py-4"><Input inputMode="decimal" {...form.register("items." + index + ".rate" as const)} placeholder="0" className="h-11 rounded-xl text-right tabular-nums" /></TableCell>
                    <TableCell className="py-4 text-right"><span className="inline-flex h-11 items-center font-bold tabular-nums text-[#102a43]">{formatPkr(linePaisa)}</span></TableCell>
                    <TableCell className="py-4 pr-4"><Button type="button" variant="ghost" size="icon" className="mt-0.5 text-slate-400 hover:text-rose-600" disabled={fields.length === 1} onClick={() => remove(index)} aria-label="Remove article"><Trash2 /></Button></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex justify-end border-t border-slate-100 bg-slate-50/60 px-6 py-5">
            <div className="flex min-w-[260px] items-center justify-between"><span className="text-sm font-semibold text-slate-500">Invoice total</span><strong className="text-xl tracking-tight text-[#102a43]">{formatPkr(totalPaisa)}</strong></div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,35,55,.04)] sm:p-6">
          <Field label="Notes"><Textarea {...form.register("notes")} placeholder="Optional note for the owner" className="min-h-24 rounded-xl" /></Field>
        </section>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-[96px] xl:self-start">
        <div className="rounded-2xl bg-[#102a43] p-6 text-white shadow-[0_16px_40px_rgba(16,42,67,.18)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">{mode === "edit" ? "Owner edit" : "Submission"}</p>
          <p className="mt-4 text-3xl font-bold tracking-[-0.04em]">{formatPkr(totalPaisa)}</p>
          <p className="mt-1 text-sm text-slate-300">{items.filter((item) => Number(item.quantity) > 0 && Number(item.rate) > 0).length} completed articles</p>
          {mode === "create" && <div className="mt-6 flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[#f5b942]" /><p className="text-xs leading-5 text-slate-300">After submission, staff cannot edit this draft. The owner can review and make changes.</p></div>}
          <Button type="submit" disabled={submitting || demoMode} className="mt-6 h-12 w-full rounded-xl bg-[#f5b942] font-bold text-[#102a43] hover:bg-[#ffc955] disabled:opacity-60">
            <CheckCircle2 />{submitting ? "Saving…" : demoMode ? "Connect Supabase to save" : mode === "edit" ? "Update invoice" : "Submit draft"}
          </Button>
        </div>
        <Button asChild variant="ghost" className="w-full text-slate-500"><Link href={invoiceId ? "/invoices/" + invoiceId : "/invoices"}><ArrowLeft />Cancel and go back</Link></Button>
      </aside>
    </form>
  );
}

function Field({ label, required = false, className = "", children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return <div className={className}><Label className="mb-2 block text-sm font-semibold text-slate-700">{label}{required && <span className="ml-1 text-rose-500">*</span>}</Label>{children}</div>;
}
