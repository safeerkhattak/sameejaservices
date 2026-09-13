import { LockKeyhole, ShieldCheck } from "lucide-react";
import { signIn } from "@/app/(auth)/login/actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const params = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-[#eef3f6] px-5 py-10">
      <div className="w-full max-w-[430px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,42,67,.14)]">
        <div className="bg-[#102a43] px-7 py-8 text-white sm:px-9">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#f5b942] text-sm font-black text-[#102a43]">SC</span>
            <div><p className="font-bold">Sameeja</p><p className="text-sm text-slate-300">Commission Services</p></div>
          </div>
          <h1 className="mt-8 text-3xl font-bold tracking-[-0.04em]">Sign in to your ledger</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">Access invoices, outstanding balances, and payment allocations.</p>
        </div>

        <form action={signIn} className="space-y-5 px-7 py-8 sm:px-9">
          <input type="hidden" name="next" value={params.next ?? "/"} />
          {params.error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{params.error}</div>}
          <label className="block"><span className="text-sm font-semibold text-[#102a43]">Email</span><input name="email" type="email" autoComplete="email" required className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 outline-none transition focus:border-[#2b7a78] focus:ring-4 focus:ring-[#2b7a78]/10" placeholder="you@company.com" /></label>
          <label className="block"><span className="text-sm font-semibold text-[#102a43]">Password</span><div className="relative mt-2"><LockKeyhole className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input name="password" type="password" autoComplete="current-password" required className="h-12 w-full rounded-xl border border-slate-200 pl-11 pr-4 outline-none transition focus:border-[#2b7a78] focus:ring-4 focus:ring-[#2b7a78]/10" placeholder="Your password" /></div></label>
          <button type="submit" className="h-12 w-full rounded-xl bg-[#2b7a78] font-bold text-white shadow-[0_10px_24px_rgba(43,122,120,.2)] transition hover:bg-[#236967] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2b7a78]/20">Sign in</button>
          <p className="flex items-center justify-center gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4 text-[#2b7a78]" />Accounts are created by the business owner.</p>
        </form>
      </div>
    </main>
  );
}
