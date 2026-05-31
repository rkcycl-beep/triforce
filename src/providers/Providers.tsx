"use client";

/**
 * Providers.tsx — Wraps the entire app with:
 * 1. SessionProvider (NextAuth) — makes login session available everywhere
 * 2. QueryClientProvider (TanStack Query) — manages data fetching & caching
 * 3. LocaleProvider — Hebrew + RTL context
 *
 * This MUST be a Client Component ('use client') because providers use React Context,
 * which only works in the browser.
 */

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import LocaleProvider from "./LocaleProvider";

interface ProvidersProps {
  children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  // Create the QueryClient inside useState so it's only created once per user session.
  // staleTime: 5 minutes — data is "fresh" for 5 min (avoids re-fetching on every click)
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            retry: 1, // Retry failed requests once before showing error
          },
        },
      })
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <LocaleProvider>{children}</LocaleProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
