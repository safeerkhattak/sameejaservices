import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireApiMember } from "@/lib/authz";
import { getDatabase, isDatabaseConfigured } from "@/lib/db";
import { appUsers, auditLogs } from "@/lib/db/schema";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

const createMemberSchema = z.object({
  displayName: z.string().trim().min(2, "Enter the staff member's name.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
  password: z.string().min(8, "The temporary password must be at least 8 characters.").max(72),
});

export async function POST(request: Request) {
  let createdAuthUserId: string | undefined;

  try {
    if (!isDatabaseConfigured() || !isSupabaseAdminConfigured()) {
      return Response.json({ error: "Supabase administrator access is not configured." }, { status: 503 });
    }

    const owner = await requireApiMember({ owner: true });
    const parsed = createMemberSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message ?? "Check the staff account details." }, { status: 400 });
    }

    const database = getDatabase();
    const existing = await database.select({ id: appUsers.id }).from(appUsers).where(eq(appUsers.email, parsed.data.email)).limit(1);
    if (existing.length) return Response.json({ error: "A team member with this email already exists." }, { status: 409 });

    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { full_name: parsed.data.displayName },
    });
    if (error || !data.user) throw new Error(error?.message ?? "Supabase could not create the staff account.");
    createdAuthUserId = data.user.id;

    const member = await database.transaction(async (tx) => {
      const rows = await tx.insert(appUsers).values({
        id: data.user.id,
        email: parsed.data.email,
        displayName: parsed.data.displayName,
        role: "staff",
        isActive: true,
      }).returning();
      await tx.insert(auditLogs).values({
        actorId: owner.id,
        action: "member_created",
        entityType: "user",
        entityId: data.user.id,
        details: { email: parsed.data.email, displayName: parsed.data.displayName, role: "staff" },
      });
      return rows[0];
    });

    return Response.json({
      member: {
        id: member.id,
        email: member.email,
        displayName: member.displayName,
        role: member.role,
        isActive: member.isActive,
        createdAt: member.createdAt,
      },
    }, { status: 201 });
  } catch (error) {
    if (createdAuthUserId) {
      await createAdminClient().auth.admin.deleteUser(createdAuthUserId).catch(() => undefined);
    }
    return teamErrorResponse(error, "The staff account could not be created.");
  }
}

function teamErrorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  if (message === "AUTH_REQUIRED") return Response.json({ error: "Sign in to continue." }, { status: 401 });
  if (message === "OWNER_REQUIRED") return Response.json({ error: "Only the master user can manage staff accounts." }, { status: 403 });
  if (message.toLowerCase().includes("already") || message.toLowerCase().includes("registered")) {
    return Response.json({ error: "A Supabase account with this email already exists." }, { status: 409 });
  }
  return Response.json({ error: message.length > 220 ? fallback : message }, { status: 400 });
}
