import { AppShell } from "@/components/app-shell";
import { getCurrentMember } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const member = await getCurrentMember("/");
  return <AppShell user={member}>{children}</AppShell>;
}
