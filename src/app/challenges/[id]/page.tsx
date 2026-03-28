import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function ChallengePage({ params }: { params: { id: string } }) {
  const cookieStore = cookies()
  const userId = cookieStore.get('triforce_user_id')?.value
  if (!userId) redirect('/login')

  const challenge = await prisma.challenge.findUnique({
    where: { id: params.id },
    include: {
      entries: {
        include: { athlete: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { ageGradeScore: 'desc' },
      },
      group: true,
    },
  })

  if (!challenge) notFound()

  const now = new Date()
  const total = challenge.endDate.getTime() - challenge.startDate.getTime()
  const elapsed = Math.min(now.getTime() - challenge.startDate.getTime(), total)
  const progress = Math.round((elapsed / total) * 100)
  const daysLeft = Math.max(0, Math.ceil((challenge.endDate.getTime() - now.getTime()) / 86400000))

  return (
    <div className="min-h-screen bg-[#f7f9f7] pb-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Back */}
        <div className="pt-6 pb-2">
          <Link href="/dashboard" className="text-sm text-[#1D9E75] font-medium">← Back</Link>
        </div>

        {/* Header */}
        <div className="bg-[#085041] text-white rounded-2xl p-6 mb-6">
          <p className="text-xs text-white/50 uppercase tracking-wider mb-1">{challenge.group.name}</p>
          <h1 className="text-xl font-bold mb-3">{challenge.title}</h1>
          {challenge.description && (
            <p className="text-sm text-white/70 mb-4">{challenge.description}</p>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">{daysLeft} days left</span>
            <span className="text-[#1D9E75] font-semibold">{challenge.sport}</span>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-[#1D9E75] rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Leaderboard */}
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Leaderboard</h2>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {challenge.entries.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">No entries yet — start training!</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {challenge.entries.map((entry, idx) => (
                <div
                  key={entry.id}
                  className={`flex items-center gap-4 px-4 py-3 ${entry.athleteId === userId ? 'bg-[#E8F5F0]' : ''}`}
                >
                  <span className={`w-6 text-center text-sm font-bold ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-orange-400' : 'text-gray-300'}`}>
                    {idx + 1}
                  </span>
                  {entry.athlete.avatarUrl ? (
                    <img src={entry.athlete.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400">
                      {entry.athlete.name?.[0]}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {entry.athlete.name}
                      {entry.athleteId === userId && <span className="ml-1 text-xs text-[#1D9E75]">(you)</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#085041]">
                      {entry.ageGradeScore?.toFixed(1) ?? '—'}%
                    </p>
                    <p className="text-xs text-gray-400">AGS</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
