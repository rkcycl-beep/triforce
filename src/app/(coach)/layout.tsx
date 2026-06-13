import CoachShell from "@/components/layout/CoachShell";

// Role guard temporarily removed — added back once auth flow is stabilized
export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return <CoachShell>{children}</CoachShell>;
}
