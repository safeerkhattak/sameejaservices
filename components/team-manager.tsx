"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Crown, KeyRound, Loader2, Plus, ShieldCheck, UserCheck, UserRound, UserX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type TeamMember = {
  id: string;
  displayName: string;
  email: string;
  role: "owner" | "staff";
  isActive: boolean;
  createdAt: string;
};

export function TeamManager({ members, currentUserId }: { members: TeamMember[]; currentUserId: string }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [resetMember, setResetMember] = useState<TeamMember | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function createMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setSubmitting(true);
    try {
      const response = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: formData.get("displayName"),
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "The staff account could not be created.");
      toast.success("Staff account created. They can sign in with the temporary password.");
      form.reset();
      setCreateOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The staff account could not be created.");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateMember(member: TeamMember, action: "activate" | "deactivate") {
    setBusyId(member.id);
    try {
      const response = await fetch("/api/team/" + member.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "The account could not be updated.");
      toast.success(action === "activate" ? "Staff access restored." : "Staff access disabled.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The account could not be updated.");
    } finally {
      setBusyId(null);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetMember) return;
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    setBusyId(resetMember.id);
    try {
      const response = await fetch("/api/team/" + resetMember.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_password", password }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "The password could not be reset.");
      toast.success("Temporary password updated.");
      setResetMember(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The password could not be reset.");
    } finally {
      setBusyId(null);
    }
  }

  const activeStaff = members.filter((member) => member.role === "staff" && member.isActive).length;

  return (
    <>
      <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,35,55,.04)]">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e7f3f2] text-[#2b7a78]"><ShieldCheck className="h-5 w-5" /></span>
            <div><h2 className="font-bold text-[#102a43]">Account access</h2><p className="mt-0.5 text-sm text-slate-500">{activeStaff} active staff {activeStaff === 1 ? "account" : "accounts"}</p></div>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="h-11 rounded-xl bg-[#2b7a78] font-bold hover:bg-[#246b69]"><Plus />Create staff account</Button>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
          {members.map((member) => (
            <article key={member.id} className={"rounded-2xl border p-5 transition " + (member.isActive ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50 opacity-80")}>
              <div className="flex items-start gap-3">
                <span className={"grid h-11 w-11 shrink-0 place-items-center rounded-xl " + (member.role === "owner" ? "bg-amber-50 text-amber-700" : member.isActive ? "bg-slate-100 text-slate-600" : "bg-rose-50 text-rose-600")}>{member.role === "owner" ? <Crown className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><p className="font-bold text-[#102a43]">{member.displayName}</p>{member.id === currentUserId && <span className="rounded-full bg-[#e7f3f2] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#2b7a78]">You</span>}</div>
                  <p className="mt-0.5 truncate text-sm text-slate-500">{member.email}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                <div className="flex gap-2"><span className="rounded-full bg-[#e7f3f2] px-2.5 py-1 text-xs font-bold capitalize text-[#2b7a78]">{member.role === "owner" ? "Master" : "Staff"}</span><span className={"rounded-full px-2.5 py-1 text-xs font-bold " + (member.isActive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>{member.isActive ? "Active" : "Disabled"}</span></div>
              </div>

              {member.role === "staff" && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button variant="outline" className="rounded-xl" onClick={() => setResetMember(member)} disabled={busyId === member.id}><KeyRound />Reset password</Button>
                  {member.isActive ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="outline" className="rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50" disabled={busyId === member.id}><UserX />Disable</Button></AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl">
                        <AlertDialogHeader><AlertDialogTitle>Disable {member.displayName}?</AlertDialogTitle><AlertDialogDescription>They will no longer be able to sign in or create invoices. Existing invoices and audit history will be preserved.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Keep active</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => updateMember(member, "deactivate")}>Disable account</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : <Button variant="outline" className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => updateMember(member, "activate")} disabled={busyId === member.id}>{busyId === member.id ? <Loader2 className="animate-spin" /> : <UserCheck />}Enable</Button>}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <Dialog open={createOpen} onOpenChange={(open) => !submitting && setCreateOpen(open)}>
        <DialogContent className="rounded-2xl sm:max-w-[520px]">
          <DialogHeader><DialogTitle>Create staff account</DialogTitle><DialogDescription>Set a temporary password and share it privately with the staff member. Only the master user can manage this account.</DialogDescription></DialogHeader>
          <form onSubmit={createMember} className="space-y-4">
            <div><Label htmlFor="staff-name" className="mb-2 block">Full name</Label><Input id="staff-name" name="displayName" required minLength={2} maxLength={80} autoComplete="off" className="h-11 rounded-xl" placeholder="Staff member name" /></div>
            <div><Label htmlFor="staff-email" className="mb-2 block">Email address</Label><Input id="staff-email" name="email" type="email" required maxLength={254} autoComplete="off" className="h-11 rounded-xl" placeholder="staff@company.com" /></div>
            <div><Label htmlFor="staff-password" className="mb-2 block">Temporary password</Label><Input id="staff-password" name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" className="h-11 rounded-xl" placeholder="At least 8 characters" /></div>
            <DialogFooter className="pt-2"><Button type="button" variant="outline" className="rounded-xl" onClick={() => setCreateOpen(false)} disabled={submitting}>Cancel</Button><Button type="submit" className="rounded-xl bg-[#2b7a78] hover:bg-[#246b69]" disabled={submitting}>{submitting ? <Loader2 className="animate-spin" /> : <Plus />}{submitting ? "Creating…" : "Create account"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(resetMember)} onOpenChange={(open) => !open && !busyId && setResetMember(null)}>
        <DialogContent className="rounded-2xl sm:max-w-[470px]">
          <DialogHeader><DialogTitle>Reset password</DialogTitle><DialogDescription>Set a new temporary password for {resetMember?.displayName}. Share it privately.</DialogDescription></DialogHeader>
          <form onSubmit={resetPassword} className="space-y-4">
            <div><Label htmlFor="reset-password" className="mb-2 block">New temporary password</Label><Input key={resetMember?.id} id="reset-password" name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" className="h-11 rounded-xl" placeholder="At least 8 characters" /></div>
            <DialogFooter><Button type="button" variant="outline" className="rounded-xl" onClick={() => setResetMember(null)} disabled={Boolean(busyId)}>Cancel</Button><Button type="submit" className="rounded-xl bg-[#2b7a78] hover:bg-[#246b69]" disabled={Boolean(busyId)}>{busyId ? <Loader2 className="animate-spin" /> : <KeyRound />}{busyId ? "Updating…" : "Update password"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
