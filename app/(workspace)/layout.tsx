import { AppShell } from "@/components/app-shell";
import { requireMember } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const member = await requireMember("/");
  return <AppShell user={member}>{children}</AppShell>;
}
