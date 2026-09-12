import { requireOwner } from "@/lib/authz";
import { normalizeInvoicePayload } from "@/lib/invoice-payload";
import { isSupabaseConfigured, supabaseRequest } from "@/lib/supabase";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!isSupabaseConfigured()) return Response.json({ error: "Connect Supabase before updating invoices." }, { status: 503 });
    const { id } = await context.params;
    const member = await requireOwner("/invoices/" + id + "/edit");
    const payload = normalizeInvoicePayload(await request.json());
    await supabaseRequest("rpc/update_invoice", {
      method: "POST",
      body: { p_actor_id: member.id, p_invoice_id: id, p_invoice: payload.invoice, p_items: payload.items },
    });
    return Response.json({ id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update the invoice.";
    return Response.json({ error: message.length > 220 ? "Could not update the invoice. Check the details and try again." : message }, { status: 400 });
  }
}
