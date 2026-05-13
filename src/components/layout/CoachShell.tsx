"use client";

/**
 * CoachShell.tsx — The layout wrapper for coach-area pages.
 *
 * Structure:
 *   Mobile: top header (logo + sign-out) + scrollable main
 *   Desktop (md+): left sidebar (logo + nav) + scrollable main
 *
 * No bottom nav — coaches typically work on a desktop. The athlete BottomNav
 * stays mobile-only inside Shell (athlete shell).
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

interface CoachShellProps {
  children: React.ReactNode;
}

const navItems = [
  { href: "/coach", label: "Dashboard" },
  { href: "/coach/groups/new", label: "New group" },
];

export default function CoachShell({ children }: CoachShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 md:flex-row">
      {/* Mobile top header */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-gray-200 bg-white/80 px-4 py-3 backdrop-blur-md md:hidden">
        <Link href="/coach" className="text-xl font-bold tracking-tight text-gray-900">
          TriForce <span className="text-sm font-normal text-gray-500">— Coach</span>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Sign out
        </button>
      </header>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-56 flex-shrink-0 border-r border-gray-200 bg-white md:flex md:flex-col">
        <div className="px-4 py-5">
          <Link href="/coach" className="text-xl font-bold tracking-tight text-gray-900">
            TriForce
          </Link>
          <p className="text-xs text-gray-500">Coach</p>
        </div>
        <nav className="flex-1 space-y-1 px-2">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md px-3 py-2 text-sm font-medium ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-2 pb-4">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="block w-full rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
