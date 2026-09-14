"use client";

import { useEffect, useTransition } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WorkspaceError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const [isRetrying, startRetry] = useTransition();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-[calc(100vh-72px)] place-items-center px-5 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-[0_18px_50px_rgba(15,35,55,.08)]">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-700">
          <AlertTriangle className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-[#102a43]">This page could not load</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">The database connection may have been interrupted. Your saved data has not been changed.</p>
        <Button
          className="mt-6 h-11 cursor-pointer rounded-xl bg-[#2b7a78] px-5 font-bold hover:bg-[#246b69]"
          disabled={isRetrying}
          aria-busy={isRetrying}
          onClick={() => startRetry(() => retry())}
        >
          {isRetrying ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          {isRetrying ? "Trying again…" : "Try again"}
        </Button>
        {error.digest && <p className="mt-5 text-xs text-slate-400">Support reference: {error.digest}</p>}
      </div>
    </main>
  );
}
