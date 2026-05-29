import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { computeLeaderboard } from "@/services/challenge.service";
import { prisma } from "@/lib/prisma";
import { formatDistance, formatDuration } from "@/lib/utils";

interface Props {
  params: Promise<{ challengeId: string }>;
}

function methodLabel(m: string) {
  if (m === "PERSONAL_IMPROVEMENT") return "Personal Improvement";
  if (m === "AGE_GRADE") return "Age Grade";
  return "Category";
}

function formatScore(score: number, method: string, cfg: Record<string, unknown>): string {
  if (method === "PERSONAL_IMPROVEMENT") return `${score >= 0 ? "+" : ""}${score.toFixed(1)}%`;
  if (method === "AGE_GRADE") return `${score.toFixed(1)}%`;
  const metric = (cfg.metric as string) ?? "distance";
  if (metric === "distance") return formatDistance(score);
  if (metric === "movingTime") return formatDuration(-score); // stored negated
  return `${(score * 3.6).toFixed(1)} km/h`;
}

export default async function ChallengeDetailPage({ params }: Props) {
  const { challengeId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) notFound();

  // Verify membership
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: { groupId: true },
  });
  if (!challenge) notFound();

  const membership = await prisma.groupMembership.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId: challenge.groupId } },
  });
  if (!membership) notFound();

  // Compute fresh leaderboard
  const result = await computeLeaderboard(challengeId);
  if (!result) notFound();

  const { challenge: c, entries } = result;
  const cfg = (c.config ?? {}) as Record<string, unknown>;
  const myEntry = entries.find((e) => e.user.id === session.user.id);
  const totalAthletes = entries.length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{c.name}</h1>
        {c.description && <p className="mt-1 text-sm text-gray-600">{c.description}</p>}
        <p className="mt-1 text-xs text-gray-500">
          {methodLabel(c.scoringMethod)} ·{" "}
          {new Date(c.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          {" – "}
          {new Date(c.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </p>
      </div>

      {/* My result card */}
      {myEntry && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Your result</p>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-blue-900">
              {formatScore(myEntry.score, c.scoringMethod, cfg)}
            </span>
            <span className="text-sm text-blue-700">
              Rank #{myEntry.rank ?? "—"} of {totalAthletes}
            </span>
          </div>
          {myEntry.metadata && typeof myEntry.metadata === "object" &&
            typeof (myEntry.metadata as Record<string,unknown>).category === "string" && (
            <p className="mt-1 text-xs text-blue-600">
              Category: {String((myEntry.metadata as Record<string,unknown>).category)}
            </p>
          )}
        </div>
      )}

      {/* Leaderboard */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-gray-900">Leaderboard</h2>
        </div>
        {entries.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-500">No scores yet.</p>
        ) : (
          <ol className="divide-y divide-gray-100">
            {entries.map((entry) => {
              const isMe = entry.user.id === session.user.id;
              return (
                <li
                  key={entry.id}
                  className={`flex items-center gap-3 px-5 py-3 ${isMe ? "bg-blue-50" : ""}`}
                >
                  <span className={`w-6 shrink-0 text-center text-sm font-bold ${entry.rank === 1 ? "text-yellow-500" : entry.rank === 2 ? "text-gray-400" : entry.rank === 3 ? "text-amber-600" : "text-gray-400"}`}>
                    {entry.rank}
                  </span>
                  {entry.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={entry.user.image} alt="" width={32} height={32} className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
                      {(entry.user.name ?? "?")[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-medium ${isMe ? "text-blue-900" : "text-gray-900"}`}>
                      {entry.user.name ?? "Athlete"}{isMe && " (you)"}
                    </p>
                    {entry.metadata && typeof entry.metadata === "object" &&
                      typeof (entry.metadata as Record<string,unknown>).category === "string" && (
                      <p className="text-xs text-gray-500">
                        {String((entry.metadata as Record<string,unknown>).category)}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-gray-700">
                    {formatScore(entry.score, c.scoringMethod, cfg)}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
