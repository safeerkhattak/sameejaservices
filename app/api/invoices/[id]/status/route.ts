import { requireOwner } from "@/lib/authz";
import { isSupabaseConfigured, supabaseRequest } from "@/lib/supabase";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!isSupabaseConfigured()) return Response.json({ error: "Connect Supabase before changing invoice status." }, { status: 503 });
    const { id } = await context.params;
    const member = await requireOwner("/invoices/" + id);
    const body = await request.json() as { status?: string };
    if (body.status !== "issued" && body.status !== "cancelled") throw new Error("Choose a valid invoice status.");
    await supabaseRequest("rpc/set_invoice_status", {
      method: "POST",
      body: { p_actor_id: member.id, p_invoice_id: id, p_status: body.status },
    });
    return Response.json({ id, status: body.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update the invoice.";
    return Response.json({ error: message.length > 220 ? "Could not update the invoice." : message }, { status: 400 });
  }
}
