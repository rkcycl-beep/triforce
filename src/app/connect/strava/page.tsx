export default function ConnectStravaPage() {
  return (
    <div className="min-h-screen bg-[#085041] flex items-center justify-center">
      <div className="text-center text-white">
        <div className="animate-spin w-8 h-8 border-2 border-white/30 border-t-white rounded-full mx-auto mb-4" />
        <p className="text-sm text-white/70">Connecting your Strava account...</p>
      </div>
    </div>
  )
}
