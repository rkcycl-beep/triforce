import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export default async function DashboardPage() {
  const cookieStore = cookies()
  const userId = cookieStore.get('triforce_user_id')?.value

  if (!userId) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        include: {
          group: {
            include: {
              challenges: {
                where: { endDate: { gte: new Date() } },
                orderBy: { endDate: 'asc' },
                take: 5,
              },
            },
          },
        },
      },
      activities: {
        orderBy: { startDate: 'desc' },
        take: 5,
      },
    },
  })

  if (!user) redirect('/login')

  const activeChallenges = user.memberships.flatMap(m => m.group.challenges)

  return (
    <div className="min-h-screen bg-[#f7f9f7] pb-24">
      {/* Top bar */}
      <header className="bg-[#085041] text-white px-4 pt-safe-top">
        <div className="max-w-2xl mx-auto flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <TriForceLogo />
            <span className="font-bold text-lg">TriForce</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/70">{user.name}</span>
            {user.avatarUrl && (
              <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-6">
        {/* Greeting */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Hey, {user.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1">Here&apos;s your training overview</p>
        </div>

        {/* Active challenges */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Active Challenges
          </h2>
          {activeChallenges.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-gray-100">
              <p className="text-gray-400 text-sm">No active challenges yet.</p>
              <p className="text-gray-400 text-sm mt-1">Your coach will create one soon!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeChallenges.map(c => (
                <Link key={c.id} href={`/challenges/${c.id}`}>
                  <div className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center justify-between hover:border-[#1D9E75] transition-colors">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{c.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Ends {new Date(c.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <SportBadge sport={c.sport} />
                      <span className="text-gray-300">›</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Recent activities */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Recent Activities
          </h2>
          {user.activities.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-gray-100">
              <p className="text-gray-400 text-sm">No activities synced yet.</p>
              {!user.stravaId && (
                <Link href="/api/auth/strava" className="inline-block mt-3 text-sm font-medium text-[#FC4C02]">
                  Connect Strava →
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {user.activities.map(act => (
                <div key={act.id} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-4">
                  <SportIcon sport={act.sportType} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{act.name ?? act.sportType}</p>
                    <p className="text-xs text-gray-400">
                      {act.distanceM ? `${(act.distanceM / 1000).toFixed(1)} km` : ''}{' '}
                      {act.durationS ? `· ${Math.round(act.durationS / 60)} min` : ''}
                    </p>
                  </div>
                  <p className="text-xs text-gray-300 whitespace-nowrap">
                    {new Date(act.startDate).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <BottomNav active="dashboard" />
    </div>
  )
}

function SportBadge({ sport }: { sport: string }) {
  const colors: Record<string, string> = {
    RUN: 'bg-orange-100 text-orange-600',
    RIDE: 'bg-blue-100 text-blue-600',
    SWIM: 'bg-cyan-100 text-cyan-600',
    ALL: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[sport] ?? colors.ALL}`}>
      {sport}
    </span>
  )
}

function SportIcon({ sport }: { sport: string }) {
  const icons: Record<string, string> = { Run: '🏃', Ride: '🚴', Swim: '🏊', Workout: '💪' }
  return (
    <div className="w-9 h-9 rounded-xl bg-[#E8F5F0] flex items-center justify-center text-lg">
      {icons[sport] ?? '⚡'}
    </div>
  )
}

function TriForceLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
      <polygon points="14,2 20,13 8,13" fill="#1D9E75" />
      <polygon points="8,15 14,26 2,26" fill="#1D9E75" />
      <polygon points="20,15 26,26 14,26" fill="#1D9E75" />
    </svg>
  )
}

function BottomNav} active }: { active: string }) {
  const items = [
    { href: '/dashboard', label: 'Home', icon: '🏠' },
    { href: '/challenges', label: 'Challenges', icon: '🏆' },
    { href: '/coach', label: 'Coach', icon: '📋' },
  ]
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe-bottom">
      <div className="max-w-2xl mx-auto flex items-center">
        {items.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center py-3 text-xs gap-1 transition-colors ${
              active === item.label.toLowerCase() ? 'text-[#085041] font-semibold' : 'text-gray-400'
            }`}
          >
            <span className="text-xl leading-none">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
