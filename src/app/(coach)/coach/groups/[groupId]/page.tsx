import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getGroupWithMembers } from "@/services/group.service";
import CopyInviteCode from "@/components/groups/CopyInviteCode";

interface Props {
  params: Promise<{ groupId: string }>;
}

export default async function GroupDetailPage({ params }: Props) {
  const { groupId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) notFound();

  const group = await getGroupWithMembers(groupId, session.user.id);
  if (!group) notFound();

  const athletes = group.memberships.filter((m) => m.role === "ATHLETE");

  return (
    <div className="space-y-6">
      <Link href="/coach" className="text-sm text-gray-500 hover:text-gray-700">
        ← Dashboard
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>

      {/* Invite code card */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Invite code
        </p>
        <div className="mt-2">
          <CopyInviteCode code={group.inviteCode} />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Share this with athletes. They enter it in Settings → Join a group.
        </p>
      </div>

      {/* Member list */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-gray-900">
            Members
            <span className="ms-2 text-sm font-normal text-gray-500">
              ({athletes.length})
            </span>
          </h2>
        </div>

        {athletes.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-500">
            No athletes yet. Share the invite code above to get started.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {athletes.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                {m.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.user.image}
                    alt=""
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
                    {(m.user.name ?? "?")[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {m.user.name ?? "Athlete"}
                  </p>
                  {m.user.email && (
                    <p className="truncate text-xs text-gray-500">
                      {m.user.email}
                    </p>
                  )}
                </div>
                <p className="shrink-0 text-xs text-gray-400">
                  {new Date(m.joinedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
