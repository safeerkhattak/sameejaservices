import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireApiMember } from "@/lib/authz";
import { getDatabase, isDatabaseConfigured } from "@/lib/db";
import { auditLogs, products } from "@/lib/db/schema";
import { parseOptionalRate, productErrorResponse, productSchema } from "@/lib/product-payload";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!isDatabaseConfigured()) return Response.json({ error: "Connect Supabase before managing products." }, { status: 503 });
    const owner = await requireApiMember({ owner: true });
    const { id } = await context.params;
    const parsed = productSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Check the product details." }, { status: 400 });
    const defaultRatePaisa = parseOptionalRate(parsed.data.defaultRate);

    await getDatabase().transaction(async (tx) => {
      const rows = await tx.update(products).set({
        articleName: parsed.data.articleName,
        mgmCode: parsed.data.mgmCode,
        subsysCode: parsed.data.subsysCode,
        unit: parsed.data.unit,
        defaultRatePaisa,
        updatedAt: new Date().toISOString(),
      }).where(eq(products.id, id)).returning();
      if (!rows[0]) throw new Error("Product not found.");
      await tx.insert(auditLogs).values({ actorId: owner.id, action: "product_updated", entityType: "product", entityId: id, details: { articleName: rows[0].articleName } });
    });
    return Response.json({ id });
  } catch (error) {
    return productErrorResponse(error);
  }
}

const statusSchema = z.object({ action: z.enum(["activate", "deactivate"]) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!isDatabaseConfigured()) return Response.json({ error: "Connect Supabase before managing products." }, { status: 503 });
    const owner = await requireApiMember({ owner: true });
    const { id } = await context.params;
    const parsed = statusSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Choose a valid product action." }, { status: 400 });
    const isActive = parsed.data.action === "activate";
    await getDatabase().transaction(async (tx) => {
      const rows = await tx.update(products).set({ isActive, updatedAt: new Date().toISOString() }).where(eq(products.id, id)).returning();
      if (!rows[0]) throw new Error("Product not found.");
      await tx.insert(auditLogs).values({ actorId: owner.id, action: isActive ? "product_activated" : "product_deactivated", entityType: "product", entityId: id, details: { articleName: rows[0].articleName } });
    });
    return Response.json({ id, isActive });
  } catch (error) {
    return productErrorResponse(error);
  }
}
