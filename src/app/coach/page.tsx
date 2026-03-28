import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function CoachPage() {
  const cookieStore = cookies()
  const userId = cookieStore.get('triforce_user_id')?.value
  if (!userId) redirect('/login')

  const coach = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      coachedGroups: {
        include: {
          members: { include: { athlete: true } },
          challenges: { orderBy: { startDate: 'desc' }, take: 10 },
        },
      },
    },
  })

  if (!coach) redirect('/login')

  return (
    <div className="min-h-screen bg-[#f7f9f7] pb-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="pt-6 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">Coach Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your groups and challenges</p>
        </div>

        {coach.coachedGroups.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
            <p className="text-gray-400 text-sm">You don&apos;t have any groups yet.</p>
            <p className="text-gray-400 text-xs mt-1">Groups will be set up by the TriForce team.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {coach.coachedGroups.map(group => (
              <div key={group.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="bg-[#085041] text-white px-5 py-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold">{group.name}</h2>
                    <p className="text-xs text-white/60">{group.members.length} athletes</p>
                  </div>
                </div>
                <div className="px-5 py-4 border-b border-gray-50">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Athletes</p>
                  <div className="flex flex-wrap gap-2">
                    {group.members.map(m => (
                      <div key={m.id} className="flex items-center gap-1.5 bg-gray-50 rounded-full px-3 py-1">
                        {m.athlete.avatarUrl ? (
                          <img src={m.athlete.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <div className="w5 h-5 rounded-full bg-[#E8F5F0] flex items-center justify-center text-xs font-bold text-[#085041]">
                            {m.athlete.name?.[0]}
                          </div>
                        )}
                        <span className="text-xs text-gray-700">{m.athlete.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="px-5 py-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Challenges</p>
                  {group.challenges.length === 0 ? (
                    <p className="text-sm text-gray-400">No challenges yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {group.challenges.map(c => (
                        <Link key={c.id} href={`/challenges/${c.id}`}>
                          <div className="flex items-center justify-between py-2 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{c.title}</p>
                              <p className="text-xs text-gray-400">
                                {new Date(c.startDate).toLocaleDateString()} – {new Date(c.endDate).toLocaleDateString()}
                              </p>
                            </div>
                            <StatusBadge start={c.startDate} end={c.endDate} />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ start, end }: { start: Date; end: Date }) {
  const now = new Date()
  if (now < start) return <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">Upcoming</span>
  if (now > end) return <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Ended</span>
  return <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-medium">Active</span>
}
