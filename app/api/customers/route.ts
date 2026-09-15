import { requireApiMember } from "@/lib/authz";
import { customerErrorResponse, customerSchema } from "@/lib/customer-payload";
import { getDatabase, isDatabaseConfigured } from "@/lib/db";
import { auditLogs, customers } from "@/lib/db/schema";

export async function POST(request: Request) {
  try {
    if (!isDatabaseConfigured()) return Response.json({ error: "Connect Supabase before managing customers." }, { status: 503 });
    const owner = await requireApiMember({ owner: true });
    const parsed = customerSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Check the customer details." }, { status: 400 });

    const customer = await getDatabase().transaction(async (tx) => {
      const rows = await tx.insert(customers).values({
        name: parsed.data.name,
        city: parsed.data.city,
        createdBy: owner.id,
      }).returning();
      await tx.insert(auditLogs).values({ actorId: owner.id, action: "customer_created", entityType: "customer", entityId: rows[0].id, details: { name: rows[0].name, city: rows[0].city } });
      return rows[0];
    });

    return Response.json({ id: customer.id }, { status: 201 });
  } catch (error) {
    return customerErrorResponse(error);
  }
}
