"use client";

import { FormEvent, useState } from "react";
import { Ban, Building2, CheckCircle2, Edit3, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Customer = {
  id: string;
  name: string;
  city: string;
  isActive: boolean;
};

export function CustomerManager({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Customer | null | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = { name: String(form.get("name") ?? ""), city: String(form.get("city") ?? "") };
    setSubmitting(true);
    try {
      const response = await fetch(editing ? `/api/customers/${editing.id}` : "/api/customers", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "The customer could not be saved.");
      toast.success(editing ? "Customer updated." : "Customer added.");
      setEditing(undefined);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The customer could not be saved.");
    } finally {
      setSubmitting(false);
    }
  }

  async function changeStatus(customer: Customer, action: "activate" | "deactivate") {
    setBusyId(customer.id);
    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "The customer could not be updated.");
      toast.success(action === "activate" ? "Customer activated." : "Customer deactivated. Existing records are unchanged.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The customer could not be updated.");
    } finally {
      setBusyId(null);
    }
  }

  const activeCount = customers.filter((customer) => customer.isActive).length;

  return (
    <>
      <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,35,55,.04)]">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e7f3f2] text-[#2b7a78]"><Building2 className="h-5 w-5" /></span>
            <div><h2 className="font-bold text-[#102a43]">Customer directory</h2><p className="mt-0.5 text-sm text-slate-500">{activeCount} active {activeCount === 1 ? "customer" : "customers"} available on new invoices</p></div>
          </div>
          <Button onClick={() => setEditing(null)} className="h-11 rounded-xl bg-[#2b7a78] font-bold hover:bg-[#246b69]"><Plus />Add customer</Button>
        </div>

        {customers.length === 0 ? (
          <div className="grid place-items-center px-6 py-16 text-center"><Building2 className="h-9 w-9 text-slate-300" /><h3 className="mt-3 font-bold text-[#102a43]">No customers yet</h3><p className="mt-1 text-sm text-slate-500">Add the first company before creating an invoice.</p></div>
        ) : (
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
            {customers.map((customer) => (
              <article key={customer.id} className={`rounded-2xl border p-5 ${customer.isActive ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50 opacity-75"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><h3 className="break-words font-bold leading-6 text-[#102a43]">{customer.name}</h3><p className="mt-1 text-sm text-slate-500">{customer.city || "City not specified"}</p></div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${customer.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{customer.isActive ? "Active" : "Inactive"}</span>
                </div>
                <p className="mt-5 border-t border-slate-100 pt-4 font-mono text-[11px] text-slate-400" title={customer.id}>Customer ID · {customer.id.slice(0, 8)}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button variant="outline" className="rounded-xl" onClick={() => setEditing(customer)} disabled={busyId === customer.id}><Edit3 />Edit</Button>
                  {customer.isActive ? (
                    <AlertDialog><AlertDialogTrigger asChild><Button variant="outline" className="rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50" disabled={busyId === customer.id} aria-busy={busyId === customer.id}>{busyId === customer.id ? <Loader2 className="animate-spin" /> : <Ban />}{busyId === customer.id ? "Deactivating…" : "Deactivate"}</Button></AlertDialogTrigger><AlertDialogContent className="rounded-2xl"><AlertDialogHeader><AlertDialogTitle>Deactivate {customer.name}?</AlertDialogTitle><AlertDialogDescription>It will no longer be available for new invoices. Existing invoices and payments will remain linked to this customer ID.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busyId === customer.id}>Keep active</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={busyId === customer.id} onClick={() => changeStatus(customer, "deactivate")}>{busyId === customer.id ? <Loader2 className="animate-spin" /> : <Ban />}{busyId === customer.id ? "Deactivating…" : "Deactivate"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                  ) : <Button variant="outline" className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => changeStatus(customer, "activate")} disabled={busyId === customer.id} aria-busy={busyId === customer.id}>{busyId === customer.id ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}{busyId === customer.id ? "Activating…" : "Activate"}</Button>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Dialog open={editing !== undefined} onOpenChange={(open) => !open && !submitting && setEditing(undefined)}>
        <DialogContent className="rounded-2xl sm:max-w-[560px]">
          <DialogHeader><DialogTitle>{editing ? "Edit customer" : "Add customer"}</DialogTitle><DialogDescription>The system assigns a permanent unique ID. The name can be changed later without breaking invoice or payment history.</DialogDescription></DialogHeader>
          <form key={editing?.id ?? "new"} onSubmit={saveCustomer} className="grid gap-4">
            <div><Label htmlFor="customer-name" className="mb-2 block">Customer name</Label><Input id="customer-name" name="name" defaultValue={editing?.name ?? ""} required minLength={2} maxLength={180} className="h-11 rounded-xl" placeholder="e.g. Metro Cash & Carry Pakistan (Pvt.) Ltd" /></div>
            <div><Label htmlFor="customer-city" className="mb-2 block">City <span className="font-normal text-slate-400">(optional)</span></Label><Input id="customer-city" name="city" defaultValue={editing?.city ?? ""} maxLength={100} className="h-11 rounded-xl" placeholder="e.g. Multan" /></div>
            <DialogFooter className="pt-2"><Button type="button" variant="outline" className="rounded-xl" onClick={() => setEditing(undefined)} disabled={submitting}>Cancel</Button><Button type="submit" className="rounded-xl bg-[#2b7a78] hover:bg-[#246b69]" disabled={submitting} aria-busy={submitting}>{submitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}{submitting ? (editing ? "Saving changes…" : "Adding customer…") : editing ? "Save changes" : "Add customer"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
