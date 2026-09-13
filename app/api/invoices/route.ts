import { getDatabase, isDatabaseConfigured } from "@/lib/db";
import { auditLogs, invoiceItems, invoices } from "@/lib/db/schema";
import { requireApiMember } from "@/lib/authz";
import { normalizeInvoicePayload } from "@/lib/invoice-payload";

export async function POST(request: Request) {
  try {
    if (!isDatabaseConfigured()) return Response.json({ error: "Connect Supabase before saving real invoices." }, { status: 503 });
    const member = await requireApiMember();
    const payload = normalizeInvoicePayload(await request.json());
    const totalPaisa = payload.items.reduce((sum, item) => sum + item.total_paisa, 0);

    const id = await getDatabase().transaction(async (tx) => {
      const inserted = await tx.insert(invoices).values({
        invoiceNumber: payload.invoice.invoice_number,
        customerName: payload.invoice.customer_name,
        customerCity: payload.invoice.customer_city,
        supplierNumber: payload.invoice.supplier_number,
        storeNumber: payload.invoice.store_number,
        storeName: payload.invoice.store_name,
        invoiceDate: payload.invoice.invoice_date,
        poNumber: payload.invoice.po_number,
        goodsReceivingNumber: payload.invoice.goods_receiving_number,
        totalPaisa,
        notes: payload.invoice.notes,
        createdBy: member.id,
      }).returning({ id: invoices.id });
      const invoiceId = inserted[0].id;

      await tx.insert(invoiceItems).values(payload.items.map((item, position) => ({
        invoiceId,
        position,
        mgmCode: item.mgm_code,
        subsysCode: item.subsys_code,
        articleName: item.article_name,
        unit: item.unit,
        quantityMillis: item.quantity_millis,
        ratePaisa: item.rate_paisa,
        totalPaisa: item.total_paisa,
      })));
      await tx.insert(auditLogs).values({ actorId: member.id, action: "created", entityType: "invoice", entityId: invoiceId, details: { invoiceNumber: payload.invoice.invoice_number } });
      return invoiceId;
    });

    return Response.json({ id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create the invoice.";
    if (message === "AUTH_REQUIRED") return Response.json({ error: "Sign in to continue." }, { status: 401 });
    if (message.includes("invoices_invoice_number_key") || message.includes("duplicate key")) return Response.json({ error: "That invoice number already exists." }, { status: 409 });
    return Response.json({ error: message.length > 220 ? "Could not create the invoice. Check the details and try again." : message }, { status: 400 });
  }
}
