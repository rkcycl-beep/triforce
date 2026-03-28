import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#085041] text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <TriForceLogo />
          <span className="text-xl font-bold tracking-tight">TriForce</span>
        </div>
        <Link href="/login" className="text-sm font-medium text-[#1D9E75] hover:text-white transition-colors">
          Sign in â
        </Link>
      </header>

      {/* Hero */}
      <main className="max-w-5xl mx-auto px-6 pt-16 pb-24">
        <div className="max-w-2xl">
          <span className="inline-block bg-[#1D9E75]/20 text-[#1D9E75] text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-6">
            Sports Team Challenges
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-6">
            Train together.<br />
            Compete fairly.<br />
            <span className="text-[#1D9E75]">Win as a team.</span>
          </h1>
          <p className="text-lg text-white/70 mb-10 leading-relaxed">
            TriForce connects coaches with their athletes through time-bound group challenges.
            Age-graded scoring makes competition fair across every age and gender.
            Connect your Strava and let your workouts do the talking.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/api/auth/strava"
              className="flex items-center justify-center gap-3 bg-[#FC4C02] hover:bg-[#e04500] text-white font-semibold px-8 py-4 rounded-xl transition-colors text-base"
            >
              <StravaIcon />
              Connect with Strava
            </Link>
            <Link
              href="/login"
              className="flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-4 rounded-xl transition-colors text-base"
            >
              Sign in with email
            </Link>
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-24">
          {features.map(f => (
            <div key={f.title} className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-white/60 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

const features = [
  {
    icon: '🏆',
    title: 'Group Challenges',
    desc: 'Coaches create weekly distance goals, training load targets, or pacing challenges for their groups.',
  },
  {
    icon: '⚡',
    title: 'Auto-Sync',
    desc: 'Connect Strava once. Every run, ride, or swim syncs automatically â no manual logging.',
  },
  {
    icon: 'ð',
    title: 'Fair Scoring',
    desc: 'Age Grade Score normalizes performance across ages and genders so everyone can compete.',
  },
]

function TriForceLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <polygon points="14,2 20,13 8,13" fill="#1D9E75" />
      <polygon points="8,15 14,26 2,26" fill="#1D9E75" />
      <polygon points="20,15 26,26 14,26" fill="#1D9E75" />
    </svg>
  )
}

function StravaIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
  )
}
