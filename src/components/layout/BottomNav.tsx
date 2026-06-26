"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";
import { useNotifications } from "@/hooks/useNotifications";

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    href: "/",
    labelKey: "nav.dashboard",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    href: "/members",
    labelKey: "nav.members",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: "/activities",
    labelKey: "nav.history",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    href: "/challenges",
    labelKey: "nav.challenges",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="6" />
        <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
      </svg>
    ),
  },
  {
    href: "/messages",
    labelKey: "messages.title",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { data: notifications = [] } = useNotifications();
  const unreadCount = notifications.length;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-md safe-bottom">
      <div className="mx-auto flex max-w-md items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const showBadge = item.href === "/messages" && unreadCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex min-h-[60px] min-w-[44px] flex-1 flex-col items-center justify-center gap-1 text-xs transition-colors ${
                isActive
                  ? "text-[#1D9E75] font-semibold"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <span className="relative">
                {item.icon}
                {showBadge && (
                  <span className="absolute -top-1.5 -end-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </span>
              <span>{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
