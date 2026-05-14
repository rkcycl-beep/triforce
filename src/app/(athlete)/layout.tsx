import Shell from "@/components/layout/Shell";

/**
 * Athlete shell — wraps athlete-area pages (/dashboard, /activities, /settings)
 * with the existing mobile-first Shell (header + bottom nav).
 *
 * No role guard here yet: an authenticated user of any role can read these
 * pages. The proxy handles the unauthenticated → / redirect.
 */
export default function AthleteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Shell>{children}</Shell>;
}
