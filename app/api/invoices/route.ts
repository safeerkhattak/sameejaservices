import { eq, inArray, sql } from "drizzle-orm";
import { getDatabase, isDatabaseConfigured } from "@/lib/db";
import { auditLogs, customers, invoiceItems, invoices, products } from "@/lib/db/schema";
import { requireApiMember } from "@/lib/authz";
import { normalizeInvoicePayload } from "@/lib/invoice-payload";

export async function POST(request: Request) {
  try {
    if (!isDatabaseConfigured()) return Response.json({ error: "Connect Supabase before saving real invoices." }, { status: 503 });
    const member = await requireApiMember();
    const payload = normalizeInvoicePayload(await request.json());
    const totalPaisa = payload.items.reduce((sum, item) => sum + item.total_paisa, 0);

    const id = await getDatabase().transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(2355801)`);
      const maxRows = await tx.select({
        value: sql<number>`coalesce(max(case when ${invoices.invoiceNumber} ~ '^[0-9]+$' then ${invoices.invoiceNumber}::bigint end), 172)`,
      }).from(invoices);
      // The client's invoice sequence begins at 175, so never allocate a lower number.
      const nextNumber = Math.max(175, Number(maxRows[0]?.value ?? 172) + 1);
      const invoiceNumber = String(nextNumber).padStart(6, "0");

      const customerRows = await tx.select().from(customers).where(eq(customers.id, payload.invoice.customer_id)).limit(1);
      const customer = customerRows[0];
      if (!customer?.isActive) throw new Error("Select an active customer before submitting the invoice.");

      const productIds = [...new Set(payload.items.map((item) => item.product_id).filter((value): value is string => Boolean(value)))];
      if (payload.items.some((item) => !item.product_id)) throw new Error("Select a product for every invoice line.");
      const productRows = await tx.select().from(products).where(inArray(products.id, productIds));
      if (productRows.length !== productIds.length || productRows.some((product) => !product.isActive)) {
        throw new Error("One or more selected products are unavailable. Refresh and try again.");
      }
      const productMap = new Map(productRows.map((product) => [product.id, product]));

      const inserted = await tx.insert(invoices).values({
        invoiceNumber,
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
        createdBy: member.id,
      }).returning({ id: invoices.id, invoiceNumber: invoices.invoiceNumber });
      const invoiceId = inserted[0].id;

      await tx.insert(invoiceItems).values(payload.items.map((item, position) => {
        const product = productMap.get(item.product_id!);
        if (!product) throw new Error("A selected product could not be found.");
        return {
          invoiceId,
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
      await tx.insert(auditLogs).values({ actorId: member.id, action: "created", entityType: "invoice", entityId: invoiceId, details: { invoiceNumber: inserted[0].invoiceNumber } });
      return invoiceId;
    });

    return Response.json({ id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create the invoice.";
    if (message === "AUTH_REQUIRED") return Response.json({ error: "Sign in to continue." }, { status: 401 });
    if (message.includes("invoices_invoice_number_key") || message.includes("duplicate key")) return Response.json({ error: "The next invoice number could not be allocated. Try again." }, { status: 409 });
    return Response.json({ error: message.length > 220 ? "Could not create the invoice. Check the details and try again." : message }, { status: 400 });
  }
}
