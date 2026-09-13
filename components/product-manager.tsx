"use client";

import { FormEvent, useState } from "react";
import { Edit3, Loader2, PackageCheck, PackageOpen, PackageX, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPkr } from "@/lib/money";

type Product = {
  id: string;
  articleName: string;
  mgmCode: string;
  subsysCode: string;
  unit: string;
  defaultRatePaisa: number | null;
  isActive: boolean;
};

export function ProductManager({ products }: { products: Product[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Product | null | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = {
      articleName: String(form.get("articleName") ?? ""),
      mgmCode: String(form.get("mgmCode") ?? ""),
      subsysCode: String(form.get("subsysCode") ?? ""),
      unit: String(form.get("unit") ?? ""),
      defaultRate: String(form.get("defaultRate") ?? ""),
    };
    setSubmitting(true);
    try {
      const response = await fetch(editing ? `/api/products/${editing.id}` : "/api/products", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "The product could not be saved.");
      toast.success(editing ? "Product updated." : "Product added to the catalog.");
      setEditing(undefined);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The product could not be saved.");
    } finally {
      setSubmitting(false);
    }
  }

  async function changeStatus(product: Product, action: "activate" | "deactivate") {
    setBusyId(product.id);
    try {
      const response = await fetch(`/api/products/${product.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "The product could not be updated.");
      toast.success(action === "activate" ? "Product activated." : "Product deactivated. Existing invoices are unchanged.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The product could not be updated.");
    } finally {
      setBusyId(null);
    }
  }

  const activeCount = products.filter((product) => product.isActive).length;

  return (
    <>
      <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,35,55,.04)]">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e7f3f2] text-[#2b7a78]"><PackageOpen className="h-5 w-5" /></span>
            <div><h2 className="font-bold text-[#102a43]">Product catalog</h2><p className="mt-0.5 text-sm text-slate-500">{activeCount} active {activeCount === 1 ? "product" : "products"} available on new invoices</p></div>
          </div>
          <Button onClick={() => setEditing(null)} className="h-11 rounded-xl bg-[#2b7a78] font-bold hover:bg-[#246b69]"><Plus />Add product</Button>
        </div>

        {products.length === 0 ? (
          <div className="grid place-items-center px-6 py-16 text-center"><PackageOpen className="h-9 w-9 text-slate-300" /><h3 className="mt-3 font-bold text-[#102a43]">Your catalog is empty</h3><p className="mt-1 text-sm text-slate-500">Add the articles that staff can select while creating an invoice.</p></div>
        ) : (
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
            {products.map((product) => (
              <article key={product.id} className={`rounded-2xl border p-5 ${product.isActive ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50 opacity-75"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><h3 className="font-bold leading-6 text-[#102a43]">{product.articleName}</h3><p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{product.unit}</p></div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${product.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{product.isActive ? "Active" : "Inactive"}</span>
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-slate-400">MGM code</dt><dd className="mt-1 font-semibold text-slate-700">{product.mgmCode}</dd></div><div><dt className="text-xs text-slate-400">Subsys code</dt><dd className="mt-1 font-semibold text-slate-700">{product.subsysCode}</dd></div><div className="col-span-2"><dt className="text-xs text-slate-400">Default Metro rate</dt><dd className="mt-1 font-semibold text-slate-700">{product.defaultRatePaisa === null ? "Not set" : `${formatPkr(product.defaultRatePaisa)} / ${product.unit}`}</dd></div></dl>
                <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
                  <Button variant="outline" className="rounded-xl" onClick={() => setEditing(product)}><Edit3 />Edit</Button>
                  {product.isActive ? (
                    <AlertDialog><AlertDialogTrigger asChild><Button variant="outline" className="rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50" disabled={busyId === product.id}><PackageX />Deactivate</Button></AlertDialogTrigger><AlertDialogContent className="rounded-2xl"><AlertDialogHeader><AlertDialogTitle>Deactivate {product.articleName}?</AlertDialogTitle><AlertDialogDescription>Staff will no longer be able to select it on new invoices. Existing invoices will keep their saved article details.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep active</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => changeStatus(product, "deactivate")}>Deactivate</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                  ) : <Button variant="outline" className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => changeStatus(product, "activate")} disabled={busyId === product.id}>{busyId === product.id ? <Loader2 className="animate-spin" /> : <PackageCheck />}Activate</Button>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Dialog open={editing !== undefined} onOpenChange={(open) => !open && !submitting && setEditing(undefined)}>
        <DialogContent className="rounded-2xl sm:max-w-[600px]">
          <DialogHeader><DialogTitle>{editing ? "Edit product" : "Add product"}</DialogTitle><DialogDescription>Keep the article name clean. Put measurement information such as Kg in the separate Unit field.</DialogDescription></DialogHeader>
          <form key={editing?.id ?? "new"} onSubmit={saveProduct} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label htmlFor="article-name" className="mb-2 block">Article name</Label><Input id="article-name" name="articleName" defaultValue={editing?.articleName ?? ""} required minLength={2} maxLength={160} className="h-11 rounded-xl" placeholder="e.g. Whole FQ Veal" /></div>
            <div><Label htmlFor="mgm-code" className="mb-2 block">MGM code</Label><Input id="mgm-code" name="mgmCode" defaultValue={editing?.mgmCode ?? ""} required maxLength={40} className="h-11 rounded-xl" /></div>
            <div><Label htmlFor="subsys-code" className="mb-2 block">Subsys code</Label><Input id="subsys-code" name="subsysCode" defaultValue={editing?.subsysCode ?? ""} required maxLength={40} className="h-11 rounded-xl" /></div>
            <div><Label htmlFor="unit" className="mb-2 block">Unit</Label><Input id="unit" name="unit" defaultValue={editing?.unit ?? "Kg"} required maxLength={20} className="h-11 rounded-xl" placeholder="Kg" /></div>
            <div><Label htmlFor="default-rate" className="mb-2 block">Default Metro rate <span className="font-normal text-slate-400">(optional)</span></Label><Input id="default-rate" name="defaultRate" type="number" inputMode="decimal" min="0.01" step="0.01" defaultValue={editing?.defaultRatePaisa == null ? "" : editing.defaultRatePaisa / 100} className="h-11 rounded-xl" placeholder="0.00" /></div>
            <DialogFooter className="pt-2 sm:col-span-2"><Button type="button" variant="outline" className="rounded-xl" onClick={() => setEditing(undefined)} disabled={submitting}>Cancel</Button><Button type="submit" className="rounded-xl bg-[#2b7a78] hover:bg-[#246b69]" disabled={submitting}>{submitting ? <Loader2 className="animate-spin" /> : <PackageCheck />}{submitting ? "Saving…" : editing ? "Save changes" : "Add product"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
