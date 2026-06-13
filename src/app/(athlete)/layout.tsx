import Shell from "@/components/layout/Shell";

// Auth guard temporarily removed — added back once auth flow is stabilized
export default function AthleteLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
