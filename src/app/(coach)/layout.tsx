import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import CoachShell from "@/components/layout/CoachShell";

/**
 * Coach shell layout — guards every page in the (coach) group with a role check.
 *
 * Why here and not proxy.ts: the proxy can't decode the JWT under Next 16
 * without triggering "Router action dispatched before initialization" (see
 * proxy.ts:8-11). A server-component layout can call getServerSession safely.
 *
 * The sign-up / sign-in pages live in a nested `(auth)` group with its own
 * layout that does NOT call this guard, so unauthenticated visitors can
 * still reach them.
 */
export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "COACH") {
    redirect("/");
  }
  return <CoachShell>{children}</CoachShell>;
}
