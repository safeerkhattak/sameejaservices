import { eq, inArray } from "drizzle-orm";
import { requireApiMember } from "@/lib/authz";
import { getDatabase, isDatabaseConfigured } from "@/lib/db";
import { auditLogs, customers, invoiceItems, invoices, paymentAllocations, products } from "@/lib/db/schema";
import { normalizeInvoicePayload } from "@/lib/invoice-payload";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!isDatabaseConfigured()) return Response.json({ error: "Connect Supabase before updating invoices." }, { status: 503 });
    const { id } = await context.params;
    const member = await requireApiMember({ owner: true });
    const payload = normalizeInvoicePayload(await request.json());
    const totalPaisa = payload.items.reduce((sum, item) => sum + item.total_paisa, 0);

    await getDatabase().transaction(async (tx) => {
      const current = await tx.select().from(invoices).where(eq(invoices.id, id)).for("update").limit(1);
      if (!current[0]) throw new Error("Invoice not found.");
      if (current[0].status === "cancelled") throw new Error("A cancelled invoice cannot be edited.");
      const allocations = await tx.select({ id: paymentAllocations.id }).from(paymentAllocations).where(eq(paymentAllocations.invoiceId, id)).limit(1);
      if (allocations.length) throw new Error("An invoice with a recorded payment cannot be edited.");

      const customerRows = await tx.select().from(customers).where(eq(customers.id, payload.invoice.customer_id)).limit(1);
      const customer = customerRows[0];
      if (!customer) throw new Error("The selected customer no longer exists.");

      const productIds = [...new Set(payload.items.map((item) => item.product_id).filter((value): value is string => Boolean(value)))];
      if (payload.items.some((item) => !item.product_id)) throw new Error("Select a product for every invoice line.");
      const productRows = await tx.select().from(products).where(inArray(products.id, productIds));
      if (productRows.length !== productIds.length) throw new Error("One or more selected products no longer exist.");
      const productMap = new Map(productRows.map((product) => [product.id, product]));

      await tx.update(invoices).set({
        customerId: customer.id,
        customerName: customer.name,
        customerCity: payload.invoice.customer_city || customer.city,
        supplierNumber: payload.invoice.supplier_number,
        storeNumber: payload.invoice.store_number,
        storeName: payload.invoice.store_name,
        invoiceDate: payload.invoice.invoice_date,
        poNumber: payload.invoice.po_number,
        goodsReceivingNumber: payload.invoice.goods_receiving_number,
        totalPaisa,
        notes: payload.invoice.notes,
        updatedAt: new Date().toISOString(),
      }).where(eq(invoices.id, id));
      await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
      await tx.insert(invoiceItems).values(payload.items.map((item, position) => {
        const product = productMap.get(item.product_id!);
        if (!product) throw new Error("A selected product could not be found.");
        return {
          invoiceId: id,
          productId: product.id,
          position,
          mgmCode: product.mgmCode,
          subsysCode: product.subsysCode,
          articleName: product.articleName,
          unit: item.unit,
          quantityMillis: item.quantity_millis,
          ratePaisa: item.rate_paisa,
          totalPaisa: item.total_paisa,
        };
      }));
      await tx.insert(auditLogs).values({ actorId: member.id, action: "updated", entityType: "invoice", entityId: id, details: { invoiceNumber: current[0].invoiceNumber } });
    });

    return Response.json({ id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update the invoice.";
    if (message === "AUTH_REQUIRED") return Response.json({ error: "Sign in to continue." }, { status: 401 });
    if (message === "OWNER_REQUIRED") return Response.json({ error: "Owner access is required." }, { status: 403 });
    return Response.json({ error: message.length > 220 ? "Could not update the invoice. Check the details and try again." : message }, { status: 400 });
  }
}
