import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireApiMember } from "@/lib/authz";
import { getDatabase, isDatabaseConfigured } from "@/lib/db";
import { appUsers, auditLogs } from "@/lib/db/schema";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

const updateMemberSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("deactivate") }),
  z.object({ action: z.literal("activate") }),
  z.object({
    action: z.literal("reset_password"),
    password: z.string().min(8, "The new temporary password must be at least 8 characters.").max(72),
  }),
]);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!isDatabaseConfigured() || !isSupabaseAdminConfigured()) {
      return Response.json({ error: "Supabase administrator access is not configured." }, { status: 503 });
    }

    const owner = await requireApiMember({ owner: true });
    const { id } = await context.params;
    const parsed = updateMemberSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message ?? "Choose a valid account action." }, { status: 400 });
    }

    const database = getDatabase();
    const rows = await database.select().from(appUsers).where(eq(appUsers.id, id)).limit(1);
    const target = rows[0];
    if (!target) return Response.json({ error: "Team member not found." }, { status: 404 });
    if (target.role === "owner" || target.id === owner.id) {
      return Response.json({ error: "The master account cannot be changed from Team management." }, { status: 400 });
    }

    const admin = createAdminClient();
    if (parsed.data.action === "reset_password") {
      const { error } = await admin.auth.admin.updateUserById(id, { password: parsed.data.password });
      if (error) throw new Error(error.message);
      await database.insert(auditLogs).values({
        actorId: owner.id,
        action: "member_password_reset",
        entityType: "user",
        entityId: id,
        details: { email: target.email },
      });
      return Response.json({ ok: true });
    }

    const activate = parsed.data.action === "activate";
    const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: activate ? "none" : "876000h" });
    if (error) throw new Error(error.message);

    await database.transaction(async (tx) => {
      await tx.update(appUsers).set({ isActive: activate }).where(eq(appUsers.id, id));
      await tx.insert(auditLogs).values({
        actorId: owner.id,
        action: activate ? "member_activated" : "member_deactivated",
        entityType: "user",
        entityId: id,
        details: { email: target.email },
      });
    });

    return Response.json({ ok: true, isActive: activate });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The staff account could not be updated.";
    if (message === "AUTH_REQUIRED") return Response.json({ error: "Sign in to continue." }, { status: 401 });
    if (message === "OWNER_REQUIRED") return Response.json({ error: "Only the master user can manage staff accounts." }, { status: 403 });
    return Response.json({ error: message.length > 220 ? "The staff account could not be updated." : message }, { status: 400 });
  }
}
