import { eq } from "drizzle-orm";
import { requireApiMember } from "@/lib/authz";
import { getDatabase, isDatabaseConfigured } from "@/lib/db";
import { auditLogs, invoices, paymentAllocations } from "@/lib/db/schema";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!isDatabaseConfigured()) return Response.json({ error: "Connect Supabase before changing invoice status." }, { status: 503 });
    const { id } = await context.params;
    const member = await requireApiMember({ owner: true });
    const body = await request.json() as { status?: string };
    if (body.status !== "issued" && body.status !== "cancelled") throw new Error("Choose a valid invoice status.");
    const nextStatus = body.status;

    await getDatabase().transaction(async (tx) => {
      const current = await tx.select().from(invoices).where(eq(invoices.id, id)).for("update").limit(1);
      if (!current[0]) throw new Error("Invoice not found.");
      if (nextStatus === "cancelled") {
        const allocations = await tx.select({ id: paymentAllocations.id }).from(paymentAllocations).where(eq(paymentAllocations.invoiceId, id)).limit(1);
        if (allocations.length) throw new Error("An invoice with a payment cannot be cancelled. Reverse the payment first.");
      }
      await tx.update(invoices).set({ status: nextStatus, updatedAt: new Date().toISOString() }).where(eq(invoices.id, id));
      await tx.insert(auditLogs).values({ actorId: member.id, action: nextStatus, entityType: "invoice", entityId: id, details: {} });
    });
    return Response.json({ id, status: nextStatus });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update the invoice.";
    if (message === "AUTH_REQUIRED") return Response.json({ error: "Sign in to continue." }, { status: 401 });
    if (message === "OWNER_REQUIRED") return Response.json({ error: "Owner access is required." }, { status: 403 });
    return Response.json({ error: message.length > 220 ? "Could not update the invoice." : message }, { status: 400 });
  }
}
