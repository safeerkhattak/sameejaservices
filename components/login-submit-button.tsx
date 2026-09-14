"use client";

import { LoaderCircle, LogIn } from "lucide-react";
import { useFormStatus } from "react-dom";

export function LoginSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#2b7a78] font-bold text-white shadow-[0_10px_24px_rgba(43,122,120,.2)] transition hover:bg-[#236967] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2b7a78]/20 disabled:cursor-wait disabled:opacity-75"
    >
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LogIn className="h-4 w-4" aria-hidden="true" />}
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}
