import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { isSupabaseConfigured, supabaseRequest } from "@/lib/supabase";

export type Member = { id: string; email: string; displayName: string; role: "owner" | "staff" };

type MemberRow = { id: string; email: string; display_name: string; role: "owner" | "staff" };

export async function getCurrentMember(returnTo = "/"): Promise<Member> {
  const identity = await requireChatGPTUser(returnTo);
  if (!isSupabaseConfigured()) {
    return { id: identity.userId, email: identity.email, displayName: identity.displayName, role: "owner" };
  }

  const rows = await supabaseRequest<MemberRow[]>("rpc/ensure_app_user", {
    method: "POST",
    body: { p_id: identity.userId, p_email: identity.email, p_display_name: identity.displayName },
  });
  const row = Array.isArray(rows) ? rows[0] : rows;
  return { id: row.id, email: row.email, displayName: row.display_name, role: row.role };
}

export async function requireOwner(returnTo = "/"): Promise<Member> {
  const member = await getCurrentMember(returnTo);
  if (member.role !== "owner") throw new Error("Owner access is required for this action.");
  return member;
}
