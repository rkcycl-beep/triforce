export const dynamic = 'force-dynamic'

'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Activity {
  id: string
  sport_type: string
  distance_m: number
  duration_s: number
  recorded_at: string
  avg_pace?: number
}

interface Challenge {
  id: string
  title: string
  sport: string
  type: string
  end_date: string
  myRank?: number
  totalParticipants?: number
  myScore?: number
}

export default function Dashboard() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [activeTab, setActiveTab] = useState<'challenges' | 'activities'>('challenges')

  useEffect(() => {
    // TODO: fetch from API once Supabase is connected
    setChallenges([
      { id: '1', title: 'Most KM This Week', sport: 'run', type: 'distance', end_date: new Date(Date.now() + 3 * 86400000).toISOString(), myRank: 3, totalParticipants: 12, myScore: 24.5 }
    ])
    setActivities([
      { id: '1', sport_type: 'Run', distance_m: 8200, duration_s: 2580, recorded_at: new Date(Date.now() - 86400000).toISOString() }
    ])
  }, [])

  const formatDist = (m: number) => (m / 1000).toFixed(1) + ' km'
  const formatTime = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`
  const sportIcon = (sport: string) => {
    const s = sport.toLowerCase()
    if (s.includes('run')) return 'ð'
    if (s.includes('ride') || s.includes('cycl')) return 'ð´'
    if (s.includes('swim')) return 'ð'
    return 'â¡'
  }
  const daysLeft = (end: string) => {
    const d = Math.ceil((new Date(end).getTime() - Date.now()) / 86400000)
    return d > 0 ? d + 'd left' : 'Ended'
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-brand text-white px-4 pt-12 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <TriForceLogo />
          <span className="font-semibold text-lg">TriForce</span>
        </div>
        <p className="text-white/70 text-sm">Your training challenges</p>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-100 flex">
        {(['challenges', 'activities'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${activeTab === tab ? 'border-brand text-brand' : 'border-transparent text-gray-400'}`}
          >{tab}</button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {activeTab === 'challenges' && challenges.map(ch => (
          <Link key={ch.id} href={`/challenges/${ch.id}`} className="block bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{sportIcon(ch.sport)}</span>
                  <h3 className="font-semibold text-gray-900">{ch.title}</h3>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{daysLeft(ch.end_date)}</p>
              </div>
              {ch.myRank && (
                <span className="bg-brand/10 text-brand text-xs font-bold px-2 py-1 rounded-full">
                  #{ch.myRank} of {ch.totalParticipants}
                </span>
              )}
            </div>
            {ch.myScore && (
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Your score</span>
                  <span>{ch.myScore.toFixed(1)} pts</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-brand rounded-full" style={{ width: `${Math.min(100, ch.myScore)}%` }} />
                </div>
              </div>
            )}
          </Link>
        ))}

        {activeTab === 'activities' && activities.map(act => (
          <div key={act.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
            <span className="text-3xl">{sportIcon(act.sport_type)}</span>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{act.sport_type}</p>
              <p className="text-sm text-gray-500">{new Date(act.recorded_at).toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900">{formatDist(act.distance_m)}</p>
              <p className="text-sm text-gray-500">{formatTime(act.duration_s)}</p>
            </div>
          </div>
        ))}

        {activeTab === 'challenges' && challenges.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">ð</p>
            <p>No active challenges yet</p>
          </div>
        )}
      </div>

      <BottomNav active="dashboard" />
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

function BottomNav({ active }: { active: string }) {
  const items = [
    { href: '/dashboard', label: 'Home', icon: 'ð ' },
    { href: '/challenges', label: 'Challenges', icon: 'ð' },
    { href: '/coach', label: 'Coach', icon: 'ð' },
  ]
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe-bottom">
      <div className="max-w-2xl mx-auto flex items-center">
        {items.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center py-3 gap-0.5 text-xs ${active === item.href.slice(1) ? 'text-brand' : 'text-gray-400'}`}
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
