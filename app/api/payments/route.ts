import { inArray, sql } from "drizzle-orm";
import { requireApiMember } from "@/lib/authz";
import { getDatabase, isDatabaseConfigured } from "@/lib/db";
import { auditLogs, invoices, paymentAllocations, payments } from "@/lib/db/schema";
import { parsePkr } from "@/lib/money";

export async function POST(request: Request) {
  try {
    if (!isDatabaseConfigured()) return Response.json({ error: "Connect Supabase before saving real payments." }, { status: 503 });
    const member = await requireApiMember({ owner: true });
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
      invoiceId: allocation.invoiceId ?? "",
      amountPaisa: parsePkr(allocation.amount) ?? 0,
    })).filter((allocation) => allocation.invoiceId && allocation.amountPaisa > 0);
    if (!allocations.length) throw new Error("Select at least one invoice.");
    if (new Set(allocations.map((allocation) => allocation.invoiceId)).size !== allocations.length) throw new Error("Each invoice can only be selected once.");
    if (allocations.reduce((sum, allocation) => sum + allocation.amountPaisa, 0) !== amountPaisa) throw new Error("The full payment must be allocated manually before saving.");

    const id = await getDatabase().transaction(async (tx) => {
      const invoiceIds = allocations.map((allocation) => allocation.invoiceId).sort();
      const invoiceRows = await tx.select().from(invoices).where(inArray(invoices.id, invoiceIds)).for("update");
      if (invoiceRows.length !== invoiceIds.length) throw new Error("One or more selected invoices no longer exist.");
      const paidRows = await tx.select({ invoiceId: paymentAllocations.invoiceId, paidPaisa: sql<number>`coalesce(sum(${paymentAllocations.amountPaisa}), 0)` })
        .from(paymentAllocations)
        .where(inArray(paymentAllocations.invoiceId, invoiceIds))
        .groupBy(paymentAllocations.invoiceId);
      const paidByInvoice = new Map(paidRows.map((row) => [row.invoiceId, Number(row.paidPaisa)]));

      allocations.forEach((allocation) => {
        const invoice = invoiceRows.find((row) => row.id === allocation.invoiceId)!;
        if (invoice.status !== "issued") throw new Error("Payments can only be allocated to issued invoices.");
        if (invoice.customerName !== body.customerName!.trim()) throw new Error("All selected invoices must belong to the chosen customer.");
        const balance = invoice.totalPaisa - (paidByInvoice.get(invoice.id) ?? 0);
        if (allocation.amountPaisa > balance) throw new Error(`Allocation exceeds the remaining balance on invoice ${invoice.invoiceNumber}.`);
      });

      const inserted = await tx.insert(payments).values({
        customerName: body.customerName!.trim(),
        paymentDate: body.paymentDate!,
        amountPaisa,
        referenceNumber: body.referenceNumber?.trim() ?? "",
        notes: body.notes?.trim() ?? "",
        createdBy: member.id,
      }).returning({ id: payments.id });
      const paymentId = inserted[0].id;
      await tx.insert(paymentAllocations).values(allocations.map((allocation) => ({ paymentId, invoiceId: allocation.invoiceId, amountPaisa: allocation.amountPaisa })));
      await tx.insert(auditLogs).values({ actorId: member.id, action: "recorded", entityType: "payment", entityId: paymentId, details: { amountPaisa, invoiceIds } });
      return paymentId;
    });

    return Response.json({ id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not record the payment.";
    if (message === "AUTH_REQUIRED") return Response.json({ error: "Sign in to continue." }, { status: 401 });
    if (message === "OWNER_REQUIRED") return Response.json({ error: "Owner access is required." }, { status: 403 });
    return Response.json({ error: message.length > 220 ? "Could not record the payment. Check the allocations and try again." : message }, { status: 400 });
  }
}
