"use server";

import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const nextValue = String(formData.get("next") ?? "/");
  const safeNext = nextValue.startsWith("/") && !nextValue.startsWith("//") ? nextValue : "/";

  if (!email || !password) redirect("/login?error=Enter+your+email+and+password");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=Invalid+email+or+password");

  const member = await getCurrentMember();
  if (!member) {
    await supabase.auth.signOut();
    redirect("/login?error=This+account+is+disabled+or+not+authorized");
  }
  redirect(safeNext);
}
