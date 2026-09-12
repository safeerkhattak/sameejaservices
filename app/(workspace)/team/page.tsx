import { Crown, UserRound } from "lucide-react";
import { requireOwner } from "@/lib/authz";
import { getTeam } from "@/lib/data";
import { PageHeading } from "@/components/page-heading";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  await requireOwner("/team");
  const members = await getTeam();
  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <PageHeading eyebrow="Access control" title="Team" description="The first account is the owner. Additional signed-in accounts can create invoice drafts but cannot edit submitted drafts or record payments." />
      <section className="mt-7 grid gap-4 sm:grid-cols-2">
        {members.map((member) => <article key={member.id} className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,35,55,.04)]"><span className={"grid h-11 w-11 shrink-0 place-items-center rounded-xl " + (member.role === "owner" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600")}>{member.role === "owner" ? <Crown className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}</span><div className="min-w-0"><p className="font-bold text-[#102a43]">{member.display_name}</p><p className="mt-0.5 truncate text-sm text-slate-500">{member.email}</p><span className="mt-3 inline-flex rounded-full bg-[#e7f3f2] px-2.5 py-1 text-xs font-bold capitalize text-[#2b7a78]">{member.role}</span></div></article>)}
      </section>
    </div>
  );
}
