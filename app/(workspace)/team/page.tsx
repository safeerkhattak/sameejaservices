import { PageHeading } from "@/components/page-heading";
import { TeamManager } from "@/components/team-manager";
import { requireOwner } from "@/lib/authz";
import { getTeam } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const owner = await requireOwner("/team");
  const members = await getTeam();

  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <PageHeading eyebrow="Access control" title="Team" description="The master user creates every staff account and controls access. Staff can submit invoice drafts but cannot edit submitted invoices or record payments." />
      <TeamManager
        currentUserId={owner.id}
        members={members.map((member) => ({
          id: member.id,
          displayName: member.display_name,
          email: member.email,
          role: member.role,
          isActive: member.is_active,
          createdAt: member.created_at,
        }))}
      />
    </div>
  );
}
