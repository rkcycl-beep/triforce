import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getAthleteChallenges } from "@/services/challenge.service";

function statusBadge(status: string) {
  const cls =
    status === "ACTIVE"
      ? "bg-green-100 text-green-700"
      : status === "COMPLETED"
      ? "bg-gray-100 text-gray-600"
      : "bg-yellow-100 text-yellow-700";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export default async function ChallengesPage() {
  const session = await getServerSession(authOptions);
  const challenges = session?.user?.id
    ? await getAthleteChallenges(session.user.id)
    : [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Challenges</h1>

      {challenges.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-sm font-medium text-gray-900">No challenges yet</p>
          <p className="mt-1 text-sm text-gray-500">
            Join a group first — challenges are created by your coach.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {challenges.map((c) => {
            const entry = c.entries[0];
            const now = new Date();
            const start = new Date(c.startDate);
            const end = new Date(c.endDate);
            const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86_400_000));

            return (
              <li key={c.id}>
                <Link
                  href={`/challenges/${c.id}`}
                  className="block rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-gray-300 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">{c.name}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{c.group.name}</p>
                    </div>
                    {statusBadge(c.status)}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      {" – "}
                      {end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      {c.status === "ACTIVE" && daysLeft > 0 && ` · ${daysLeft}d left`}
                    </span>
                    {entry && (
                      <span className="font-medium text-gray-700">
                        Rank #{entry.rank ?? "—"} · {entry.score.toFixed(1)}pts
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
