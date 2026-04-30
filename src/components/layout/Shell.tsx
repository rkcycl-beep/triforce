"use client";

/**
 * Shell.tsx — The responsive layout wrapper for the entire app.
 *
 * Structure:
 *   [Header]          ← Always visible at top
 *   [Page Content]    ← Scrollable area in the middle
 *   [BottomNav]       ← Always visible at bottom (mobile tab bar)
 *
 * The content area has padding-bottom to account for the BottomNav height,
 * so nothing gets hidden behind it.
 */

import { useSession } from "next-auth/react";
import Header from "./Header";
import BottomNav from "./BottomNav";

interface ShellProps {
  children: React.ReactNode;
}

export default function Shell({ children }: ShellProps) {
  const { data: session } = useSession();

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />

      {/* Main content — scrollable, padded for mobile bottom nav */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-24 pt-4 md:pb-8">
        {children}
      </main>

      {/* Bottom nav only shows when logged in */}
      {session && <BottomNav />}
    </div>
  );
}
