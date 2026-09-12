"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WorkspaceError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="grid min-h-[calc(100vh-72px)] place-items-center px-5"><div className="max-w-md rounded-2xl border border-rose-200 bg-white p-7 text-center shadow-[0_16px_50px_rgba(15,35,55,.08)]"><span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-rose-50 text-rose-600"><AlertTriangle /></span><h1 className="mt-5 text-xl font-bold text-[#102a43]">This screen could not load</h1><p className="mt-2 text-sm leading-6 text-slate-500">Your data was not changed. Check the database connection and try again.</p><Button onClick={reset} className="mt-5 rounded-xl bg-[#2b7a78] hover:bg-[#246b69]"><RotateCcw />Try again</Button></div></div>;
}
