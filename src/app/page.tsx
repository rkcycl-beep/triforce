/**
 * Landing Page (/) — server component.
 *
 * If signed in: redirect coaches to /coach, athletes to /dashboard.
 * If not: render the marketing hero + Strava sign-in button.
 *
 * proxy.ts no longer redirects /; it can't know the role from the cookie alone.
 */

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import LandingHero from "@/components/landing/LandingHero";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role === "COACH") redirect("/coach");
  if (session?.user?.id) redirect("/dashboard");
  return <LandingHero />;
}
