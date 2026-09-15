"use client";

import { useState, useTransition } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { ArrowLeft, Building2, CheckCircle2, FileText, Loader2, LockKeyhole, PackageOpen, Plus, Trash2 } from "lucide-react";
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
import { todayForDateInput } from "@/lib/date";
import { customerLabel } from "@/lib/customer-label";

export type InvoiceProductOption = {
  id: string;
  mgmCode: string;
  subsysCode: string;
  articleName: string;
  unit: string;
  defaultRate: string;
  isActive: boolean;
};

export type InvoiceCustomerOption = {
  id: string;
  name: string;
  city: string;
  isActive: boolean;
};

const itemSchema = z.object({
  productId: z.string().uuid(),
  mgmCode: z.string(),
  subsysCode: z.string(),
  articleName: z.string().min(1),
  unit: z.string().min(1),
  quantity: z.string().refine((value) => Number(value) > 0),
  rate: z.string().refine((value) => Number(value) > 0),
});

const formSchema = z.object({
  customerId: z.string().uuid(),
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

const blankItem = { productId: "", mgmCode: "", subsysCode: "", articleName: "", unit: "", quantity: "", rate: "" };

export function InvoiceForm({
  mode = "create",
  invoiceId,
  initialValues,
  demoMode,
  products,
  customers,
  assignedInvoiceNumber,
  canManageProducts = false,
  canManageCustomers = false,
}: {
  mode?: "create" | "edit";
  invoiceId?: string;
  initialValues?: InvoiceFormValues;
  demoMode: boolean;
  products: InvoiceProductOption[];
  customers: InvoiceCustomerOption[];
  assignedInvoiceNumber?: string;
  canManageProducts?: boolean;
  canManageCustomers?: boolean;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [isNavigating, startNavigation] = useTransition();
  const router = useRouter();
  const today = todayForDateInput();
  const form = useForm<InvoiceFormValues>({
    defaultValues: initialValues ?? {
      customerId: customers[0]?.id ?? "",
      customerCity: customers[0]?.city ?? "",
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
  const customerId = useWatch({ control: form.control, name: "customerId" });
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
      startNavigation(() => router.push("/invoices/" + (payload.id || invoiceId)));
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
            <Field label="Invoice number">
              <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-[#102a43]">
                {assignedInvoiceNumber ? `INV-${assignedInvoiceNumber}` : "Assigned automatically when submitted"}
              </div>
            </Field>
            <Field label="Invoice date" required><Input type="date" {...form.register("invoiceDate")} className="h-11 rounded-xl" /></Field>
            <Field label="Supplier number"><Input {...form.register("supplierNumber")} placeholder="23558" className="h-11 rounded-xl" /></Field>
            <Field label="Store number"><Input {...form.register("storeNumber")} placeholder="e.g. 15" className="h-11 rounded-xl" /></Field>
            <Field label="Store name" required><Input {...form.register("storeName")} placeholder="e.g. Multan" className="h-11 rounded-xl" /></Field>
            <Field label="Customer city"><Input {...form.register("customerCity")} placeholder="e.g. Lahore" className="h-11 rounded-xl" /></Field>
            <Field label="PO number"><Input {...form.register("poNumber")} placeholder="Purchase order reference" className="h-11 rounded-xl" /></Field>
            <Field label="Goods receiving number"><Input {...form.register("goodsReceivingNumber")} placeholder="Metro receiving reference" className="h-11 rounded-xl" /></Field>
            <Field label="Customer" required className="sm:col-span-2 lg:col-span-1">
              <Select value={customerId || undefined} onValueChange={(nextCustomerId) => {
                const customer = customers.find((entry) => entry.id === nextCustomerId);
                form.setValue("customerId", nextCustomerId);
                form.setValue("customerCity", customer?.city ?? "");
              }}>
                <SelectTrigger className="h-11 w-full rounded-xl"><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>{customers.map((customer) => <SelectItem key={customer.id} value={customer.id} disabled={!customer.isActive}>{customerLabel(customer, customers)}{!customer.isActive ? " (inactive)" : ""}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
        </section>

        {customers.length === 0 && (
          <section className="grid place-items-center rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-[0_10px_30px_rgba(15,35,55,.04)]">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500"><Building2 className="h-6 w-6" /></span>
            <h3 className="mt-4 font-bold text-[#102a43]">No customers are available</h3>
            <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">{canManageCustomers ? "Create a customer before entering an invoice." : "Ask the master user to add and activate the customer first."}</p>
            {canManageCustomers && <Button asChild className="mt-5 rounded-xl bg-[#2b7a78] hover:bg-[#246b69]"><Link href="/customers"><Plus />Add first customer</Link></Button>}
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,35,55,.04)]">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div><h2 className="font-bold text-[#102a43]">Received articles</h2><p className="mt-0.5 text-sm text-slate-500">Choose an article, then confirm its unit and enter the received quantity and rate.</p></div>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => append({ ...blankItem })} disabled={products.length === 0}><Plus />Add article</Button>
          </div>
          {products.length === 0 ? (
            <div className="grid place-items-center px-6 py-14 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500"><PackageOpen className="h-6 w-6" /></span>
              <h3 className="mt-4 font-bold text-[#102a43]">No products are available</h3>
              <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">{canManageProducts ? "Create your product catalog before entering an invoice." : "Ask the master user to add and activate products before creating an invoice."}</p>
              {canManageProducts && <Button asChild className="mt-5 rounded-xl bg-[#2b7a78] hover:bg-[#246b69]"><Link href="/products"><Plus />Add first product</Link></Button>}
            </div>
          ) : <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                <TableHead className="min-w-[250px] px-6">Article</TableHead>
                <TableHead className="min-w-[105px]">MGM #</TableHead>
                <TableHead className="min-w-[105px]">Subsys #</TableHead>
                <TableHead className="min-w-[110px]">Unit</TableHead>
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
                      <Select value={item.productId || undefined} onValueChange={(productId) => {
                        const product = products.find((entry) => entry.id === productId);
                        if (!product) return;
                        form.setValue(`items.${index}.productId`, product.id);
                        form.setValue(`items.${index}.articleName`, product.articleName);
                        form.setValue(`items.${index}.mgmCode`, product.mgmCode);
                        form.setValue(`items.${index}.subsysCode`, product.subsysCode);
                        form.setValue(`items.${index}.unit`, product.unit);
                        if (!item.rate && product.defaultRate) form.setValue(`items.${index}.rate`, product.defaultRate);
                      }}>
                        <SelectTrigger className="h-11 w-full min-w-[230px] rounded-xl"><SelectValue placeholder="Select article" /></SelectTrigger>
                        <SelectContent>{products.map((product) => <SelectItem key={product.id} value={product.id} disabled={!product.isActive}>{product.articleName}{!product.isActive ? " (inactive)" : ""}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="py-4"><Input {...form.register(`items.${index}.mgmCode`)} readOnly className="h-11 rounded-xl bg-slate-50" /></TableCell>
                    <TableCell className="py-4"><Input {...form.register(`items.${index}.subsysCode`)} readOnly className="h-11 rounded-xl bg-slate-50" /></TableCell>
                    <TableCell className="py-4"><Input {...form.register(`items.${index}.unit`)} placeholder="Kg" className="h-11 rounded-xl text-center font-semibold" aria-label={`Unit for article ${index + 1}`} /></TableCell>
                    <TableCell className="py-4"><Input inputMode="decimal" {...form.register(`items.${index}.quantity`)} placeholder="0.000" className="h-11 rounded-xl text-right tabular-nums" /></TableCell>
                    <TableCell className="py-4"><Input inputMode="decimal" {...form.register(`items.${index}.rate`)} placeholder="0" className="h-11 rounded-xl text-right tabular-nums" /></TableCell>
                    <TableCell className="py-4 text-right"><span className="inline-flex h-11 items-center font-bold tabular-nums text-[#102a43]">{formatPkr(linePaisa)}</span></TableCell>
                    <TableCell className="py-4 pr-4"><Button type="button" variant="ghost" size="icon" className="mt-0.5 text-slate-400 hover:text-rose-600" disabled={fields.length === 1} onClick={() => remove(index)} aria-label="Remove article"><Trash2 /></Button></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>}
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
          <Button type="submit" disabled={submitting || isNavigating || demoMode || products.length === 0 || customers.length === 0} aria-busy={submitting || isNavigating} className="mt-6 h-12 w-full rounded-xl bg-[#f5b942] font-bold text-[#102a43] hover:bg-[#ffc955] disabled:opacity-60">
            {submitting || isNavigating ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}{submitting || isNavigating ? (mode === "edit" ? "Updating invoice…" : "Submitting draft…") : demoMode ? "Connect Supabase to save" : mode === "edit" ? "Update invoice" : "Submit draft"}
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
