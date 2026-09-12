import { requireOwner } from "@/lib/authz";
import { parsePkr } from "@/lib/money";
import { isSupabaseConfigured, supabaseRequest } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) return Response.json({ error: "Connect Supabase before saving real payments." }, { status: 503 });
    const member = await requireOwner("/payments/new");
    const body = await request.json() as {
      customerName?: string;
      paymentDate?: string;
      amount?: unknown;
      referenceNumber?: string;
      notes?: string;
      allocations?: { invoiceId?: string; amount?: unknown }[];
    };
    const amountPaisa = parsePkr(body.amount);
    if (!body.customerName?.trim() || !body.paymentDate || !amountPaisa || amountPaisa <= 0) throw new Error("Customer, payment date and amount are required.");
    const allocations = (body.allocations ?? []).map((allocation) => ({
      invoice_id: allocation.invoiceId,
      amount_paisa: parsePkr(allocation.amount),
    })).filter((allocation): allocation is { invoice_id: string; amount_paisa: number } => Boolean(allocation.invoice_id && allocation.amount_paisa && allocation.amount_paisa > 0));
    const allocated = allocations.reduce((sum, allocation) => sum + allocation.amount_paisa, 0);
    if (allocated !== amountPaisa) throw new Error("The full payment must be allocated manually before saving.");

    const id = await supabaseRequest<string>("rpc/record_payment", {
      method: "POST",
      body: {
        p_actor_id: member.id,
        p_payment: {
          customer_name: body.customerName.trim(),
          payment_date: body.paymentDate,
          amount_paisa: amountPaisa,
          reference_number: body.referenceNumber?.trim() ?? "",
          notes: body.notes?.trim() ?? "",
        },
        p_allocations: allocations,
      },
    });
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not record the payment.";
    return Response.json({ error: message.length > 220 ? "Could not record the payment. Check the allocations and try again." : message }, { status: 400 });
  }
}
