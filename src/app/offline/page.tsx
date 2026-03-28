export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#085041] flex items-center justify-center px-4">
      <div className="text-center text-white max-w-xs">
        <div className="text-5xl mb-6">📡</div>
        <h1 className="text-xl font-bold mb-2">You&apos;re offline</h1>
        <p className="text-sm text-white/60">
          Check your connection and try again. Your data will sync when you&apos;re back online.
        </p>
      </div>
    </div>
  )
}
