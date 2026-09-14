"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Edit3, Loader2, Printer, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function InvoiceActions({ invoiceId, status, isOwner, demoMode }: { invoiceId: string; status: string; isOwner: boolean; demoMode: boolean }) {
  const [busyStatus, setBusyStatus] = useState<"issued" | "cancelled" | null>(null);

  async function setStatus(nextStatus: "issued" | "cancelled") {
    if (demoMode) {
      toast.info("Connect Supabase to change invoice status.");
      return;
    }
    setBusyStatus(nextStatus);
    try {
      const response = await fetch("/api/invoices/" + invoiceId + "/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Invoice status could not be changed.");
      toast.success(nextStatus === "issued" ? "Invoice approved and issued." : "Invoice cancelled.");
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invoice status could not be changed.");
      setBusyStatus(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-3 print:hidden">
      <Button variant="outline" className="h-11 rounded-xl bg-white" onClick={() => window.print()}><Printer />Print invoice</Button>
      {isOwner && status !== "cancelled" && <Button asChild variant="outline" className="h-11 rounded-xl bg-white"><Link href={"/invoices/" + invoiceId + "/edit"}><Edit3 />Edit</Link></Button>}
      {isOwner && status === "pending_review" && <Button className="h-11 rounded-xl bg-[#2b7a78] hover:bg-[#246b69]" onClick={() => setStatus("issued")} disabled={busyStatus !== null} aria-busy={busyStatus === "issued"}>{busyStatus === "issued" ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}{busyStatus === "issued" ? "Approving…" : "Approve & issue"}</Button>}
      {isOwner && status !== "cancelled" && (
        <AlertDialog>
          <AlertDialogTrigger asChild><Button variant="outline" className="h-11 rounded-xl border-rose-200 bg-white text-rose-700 hover:bg-rose-50" disabled={busyStatus !== null}>{busyStatus === "cancelled" ? <Loader2 className="animate-spin" /> : <XCircle />}{busyStatus === "cancelled" ? "Cancelling…" : "Cancel invoice"}</Button></AlertDialogTrigger>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader><AlertDialogTitle>Cancel this invoice?</AlertDialogTitle><AlertDialogDescription>The invoice will remain in the audit history but will no longer count toward outstanding balances.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel disabled={busyStatus !== null}>Keep invoice</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={busyStatus !== null} onClick={() => setStatus("cancelled")}>{busyStatus === "cancelled" ? <Loader2 className="animate-spin" /> : <XCircle />}{busyStatus === "cancelled" ? "Cancelling…" : "Cancel invoice"}</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
