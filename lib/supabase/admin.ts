import "server-only";

import { createClient } from "@supabase/supabase-js";

export function isSupabaseAdminConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  return Boolean(url && secret && !url.includes("your-project") && !secret.includes("your-server-secret"));
}

export function createAdminClient() {
  if (!isSupabaseAdminConfigured()) throw new Error("Supabase administrator access is not configured.");

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );
}
