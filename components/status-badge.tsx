import { Badge } from "@/components/ui/badge";

export type InvoiceStatus = "pending_review" | "issued" | "cancelled" | "paid" | "partially_paid" | "unpaid";

const statusStyles: Record<InvoiceStatus, { label: string; className: string }> = {
  pending_review: { label: "Awaiting review", className: "bg-sky-50 text-sky-700 ring-sky-600/15" },
  issued: { label: "Issued", className: "bg-slate-100 text-slate-700 ring-slate-600/15" },
  cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-500 ring-slate-500/15" },
  paid: { label: "Paid", className: "bg-teal-50 text-teal-700 ring-teal-600/15" },
  partially_paid: { label: "Partially paid", className: "bg-amber-50 text-amber-700 ring-amber-600/15" },
  unpaid: { label: "Unpaid", className: "bg-rose-50 text-rose-700 ring-rose-600/15" },
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  const item = statusStyles[status];
  return <Badge variant="outline" className={`rounded-full border-0 px-2.5 py-1 font-bold ring-1 ring-inset ${item.className}`}>{item.label}</Badge>;
}
