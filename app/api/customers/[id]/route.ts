import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireApiMember } from "@/lib/authz";
import { customerErrorResponse, customerSchema } from "@/lib/customer-payload";
import { getDatabase, isDatabaseConfigured } from "@/lib/db";
import { auditLogs, customers } from "@/lib/db/schema";

const idSchema = z.string().uuid();
const statusSchema = z.object({ action: z.enum(["activate", "deactivate"]) });

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!isDatabaseConfigured()) return Response.json({ error: "Connect Supabase before managing customers." }, { status: 503 });
    const owner = await requireApiMember({ owner: true });
    const { id } = await context.params;
    if (!idSchema.safeParse(id).success) throw new Error("Customer not found.");
    const parsed = customerSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Check the customer details." }, { status: 400 });

    await getDatabase().transaction(async (tx) => {
      const rows = await tx.update(customers).set({
        name: parsed.data.name,
        city: parsed.data.city,
        updatedAt: new Date().toISOString(),
      }).where(eq(customers.id, id)).returning();
      if (!rows[0]) throw new Error("Customer not found.");
      await tx.insert(auditLogs).values({ actorId: owner.id, action: "customer_updated", entityType: "customer", entityId: id, details: { name: rows[0].name, city: rows[0].city } });
    });

    return Response.json({ id });
  } catch (error) {
    return customerErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!isDatabaseConfigured()) return Response.json({ error: "Connect Supabase before managing customers." }, { status: 503 });
    const owner = await requireApiMember({ owner: true });
    const { id } = await context.params;
    if (!idSchema.safeParse(id).success) throw new Error("Customer not found.");
    const parsed = statusSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Choose a valid customer action." }, { status: 400 });
    const isActive = parsed.data.action === "activate";

    await getDatabase().transaction(async (tx) => {
      const rows = await tx.update(customers).set({ isActive, updatedAt: new Date().toISOString() }).where(eq(customers.id, id)).returning();
      if (!rows[0]) throw new Error("Customer not found.");
      await tx.insert(auditLogs).values({ actorId: owner.id, action: isActive ? "customer_activated" : "customer_deactivated", entityType: "customer", entityId: id, details: { name: rows[0].name, city: rows[0].city } });
    });

    return Response.json({ id, isActive });
  } catch (error) {
    return customerErrorResponse(error);
  }
}
