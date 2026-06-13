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
  { href: "/coach", label: "לוח בקרה", exact: true },
  { href: "/coach/groups", label: "קבוצות" },
  { href: "/coach/groups/new", label: "+ קבוצה חדשה" },
];

export default function CoachShell({ children }: CoachShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 md:flex-row">
      {/* Mobile top header */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur-md md:hidden">
        <Link href="/coach" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1D9E75] to-[#085041]">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
            </svg>
          </div>
          <span className="text-base font-bold text-gray-900">TriForce <span className="text-xs font-normal text-gray-400">· מאמן</span></span>
        </Link>
        <button onClick={() => signOut({ callbackUrl: "/" })} className="text-xs text-gray-400 hover:text-gray-700">
          התנתק
        </button>
      </header>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-56 flex-shrink-0 border-e border-gray-100 bg-white md:flex md:flex-col">
        <div className="px-5 py-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#1D9E75] to-[#085041] shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-extrabold text-gray-900">TriForce</p>
              <p className="text-[10px] text-gray-400">ממשק מאמן</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 px-3">
          {navItems.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#E1F5EE] text-[#085041] font-bold"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 pb-5">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="block w-full rounded-xl px-3 py-2.5 text-start text-sm text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700"
          >
            התנתק
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
