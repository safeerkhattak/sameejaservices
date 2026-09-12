import { getCurrentMember } from "@/lib/authz";
import { normalizeInvoicePayload } from "@/lib/invoice-payload";
import { isSupabaseConfigured, supabaseRequest } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) return Response.json({ error: "Connect Supabase before saving real invoices." }, { status: 503 });
    const member = await getCurrentMember("/invoices/new");
    const payload = normalizeInvoicePayload(await request.json());
    const id = await supabaseRequest<string>("rpc/create_invoice", {
      method: "POST",
      body: { p_actor_id: member.id, p_invoice: payload.invoice, p_items: payload.items },
    });
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create the invoice.";
    return Response.json({ error: friendlyError(message) }, { status: 400 });
  }
}

function friendlyError(message: string) {
  if (message.includes("duplicate") || message.includes("uq_invoices") || message.includes("invoices_invoice_number_key")) return "That invoice number already exists.";
  return message.length > 220 ? "Could not create the invoice. Check the details and try again." : message;
}
