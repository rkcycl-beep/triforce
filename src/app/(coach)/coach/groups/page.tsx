import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getGroupsByCoach } from "@/services/group.service";
import Button from "@/components/ui/Button";

export default async function CoachGroupsPage() {
  const session = await getServerSession(authOptions);
  const groups = session?.user?.id
    ? await getGroupsByCoach(session.user.id)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
        <Link href="/coach/groups/new">
          <Button>New group</Button>
        </Link>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-sm font-medium text-gray-900">No groups yet</p>
          <p className="mt-1 text-sm text-gray-500">
            Create a group to get your athletes connected.
          </p>
          <div className="mt-4 flex justify-center">
            <Link href="/coach/groups/new">
              <Button>Create your first group</Button>
            </Link>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {groups.map((group) => (
            <li key={group.id}>
              <Link
                href={`/coach/groups/${group.id}`}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-gray-300 hover:shadow-sm"
              >
                <div>
                  <p className="font-semibold text-gray-900">{group.name}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {group._count.memberships}{" "}
                    {group._count.memberships === 1 ? "member" : "members"}
                    {" · "}
                    Invite:{" "}
                    <span className="font-mono font-medium">
                      {group.inviteCode}
                    </span>
                  </p>
                </div>
                <span className="text-sm text-gray-400">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
