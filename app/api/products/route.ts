import { requireApiMember } from "@/lib/authz";
import { getDatabase, isDatabaseConfigured } from "@/lib/db";
import { auditLogs, products } from "@/lib/db/schema";
import { parseOptionalRate, productErrorResponse, productSchema } from "@/lib/product-payload";

export async function POST(request: Request) {
  try {
    if (!isDatabaseConfigured()) return Response.json({ error: "Connect Supabase before managing products." }, { status: 503 });
    const owner = await requireApiMember({ owner: true });
    const parsed = productSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Check the product details." }, { status: 400 });
    const defaultRatePaisa = parseOptionalRate(parsed.data.defaultRate);

    const product = await getDatabase().transaction(async (tx) => {
      const rows = await tx.insert(products).values({
        articleName: parsed.data.articleName,
        mgmCode: parsed.data.mgmCode,
        subsysCode: parsed.data.subsysCode,
        unit: parsed.data.unit,
        defaultRatePaisa,
        createdBy: owner.id,
      }).returning();
      await tx.insert(auditLogs).values({ actorId: owner.id, action: "product_created", entityType: "product", entityId: rows[0].id, details: { articleName: rows[0].articleName } });
      return rows[0];
    });
    return Response.json({ id: product.id }, { status: 201 });
  } catch (error) {
    return productErrorResponse(error);
  }
}
