import Link from 'next/link'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <div className="min-h-screen bg-[#f7f9f7] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <TriForceLogo />
            <span className="text-xl font-bold text-[#085041]">TriForce</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
        </div>

        {searchParams.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-6">
            {searchParams.error === 'strava_denied'
              ? 'Strava connection was denied. Please try again.'
              : 'Something went wrong. Please try again.'}
          </div>
        )}

        <Link
          href="/api/auth/strava"
          className="flex items-center justify-center gap-3 w-full bg-[#FC4C02] hover:bg-[#e04500] text-white font-semibold py-4 rounded-xl transition-colors mb-4 text-base"
        >
          <StravaIcon />
          Continue with Strava
        </Link>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w'wfull border-t border-gray-200" />
          </div>
          <div className="relative text-center">
            <span className="bg-[#f7f9f7] px-3 text-xs text-gray-400">or</span>
          </div>
        </div>

        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              className="wwfull border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] bg-white"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              className="w'wfull border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] bg-white"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-[#085041] hover:bg-[#064033] text-white font-semibold py-4 rounded-xl transition-colors text-sm"
          >
            Sign in
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-8">
          Don&apos;t have an account?{ ' '}
          <Link href="/api/auth/strava" className="text-[#1D9E75] font-medium">
            Connect with Strava to join
          </Link>
        </p>
      </div>
    </div>
  )
}

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
