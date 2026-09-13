import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const requestUrl = new URL(request.url);
  const next = safeReturnTo(requestUrl.searchParams.get("next") ?? "/");
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", next);
  if (requestUrl.searchParams.get("reason") === "access") {
    loginUrl.searchParams.set("error", "This account is disabled or is not authorized for this application.");
  }
  return NextResponse.redirect(loginUrl, { status: 303 });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}

function safeReturnTo(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}
