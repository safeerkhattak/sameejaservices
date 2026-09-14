import { cache } from "react";
import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { appUsers } from "@/lib/db/schema";
import { getDatabase, isDatabaseConfigured } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseAuthConfigured } from "@/lib/supabase/config";
import { isDemoModeEnabled } from "@/lib/demo";

export type Member = { id: string; email: string; displayName: string; role: "owner" | "staff"; isActive: boolean };

const loadCurrentMember = cache(async (): Promise<Member | null> => {
  if (!isDatabaseConfigured() || !isSupabaseAuthConfigured()) {
    return isDemoModeEnabled()
      ? { id: "00000000-0000-4000-8000-000000000001", email: "owner@sameeja.test", displayName: "Business Owner", role: "owner", isActive: true }
      : null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims as { sub?: string; email?: string; user_metadata?: { full_name?: string; name?: string } } | undefined;
  if (error || !claims?.sub || !claims.email) return null;

  const displayName = claims.user_metadata?.full_name ?? claims.user_metadata?.name ?? claims.email.split("@")[0];
  const database = getDatabase();

  const existing = await database.select().from(appUsers).where(eq(appUsers.id, claims.sub!)).limit(1);
  if (existing[0]) return existing[0].isActive ? toMember(existing[0]) : null;

  return database.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(23558)`);
    const rechecked = await tx.select().from(appUsers).where(eq(appUsers.id, claims.sub!)).limit(1);
    if (rechecked[0]) return rechecked[0].isActive ? toMember(rechecked[0]) : null;

    const firstUser = (await tx.select({ id: appUsers.id }).from(appUsers).limit(1)).length === 0;
    if (!firstUser) return null;

    const inserted = await tx.insert(appUsers).values({
      id: claims.sub!,
      email: claims.email!,
      displayName,
      role: "owner",
    }).returning();
    return toMember(inserted[0]);
  });
});

export async function getCurrentMember() {
  return loadCurrentMember();
}

export async function requireMember(returnTo = "/") {
  const member = await loadCurrentMember();
  if (!member) redirect("/auth/signout?reason=access&next=" + encodeURIComponent(safeReturnTo(returnTo)));
  return member;
}

export async function requireOwner(returnTo = "/") {
  const member = await requireMember(returnTo);
  if (member.role !== "owner") throw new Error("Owner access is required for this action.");
  return member;
}

export async function requireApiMember(options: { owner?: boolean } = {}) {
  const member = await loadCurrentMember();
  if (!member) throw new Error("AUTH_REQUIRED");
  if (options.owner && member.role !== "owner") throw new Error("OWNER_REQUIRED");
  return member;
}

function toMember(row: typeof appUsers.$inferSelect): Member {
  return { id: row.id, email: row.email, displayName: row.displayName, role: row.role as "owner" | "staff", isActive: row.isActive };
}

function safeReturnTo(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}
