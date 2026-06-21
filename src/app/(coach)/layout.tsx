import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import CoachShell from "@/components/layout/CoachShell";

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "COACH") {
    redirect("/coach/sign-in");
  }
  return <CoachShell>{children}</CoachShell>;
}
