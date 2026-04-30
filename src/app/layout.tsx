import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Providers from "@/providers/Providers";
import Shell from "@/components/layout/Shell";
import "./globals.css";

/**
 * Root Layout — wraps EVERY page in the app.
 *
 * It loads:
 * 1. Google Fonts (Geist) — clean, modern font
 * 2. Providers — auth session + data caching
 * 3. Shell — responsive header + bottom nav layout
 *
 * This is a Server Component (no 'use client') — it renders on the server
 * for faster initial page load. The Providers and Shell inside it are
 * Client Components, which is fine — Server Components can render Client Components.
 */

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TriForce — Sports Tracker",
  description: "Track your Strava and Garmin activities in one place",
};

// Mobile-optimized viewport settings
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Prevents accidental zoom on input focus (mobile)
  viewportFit: "cover", // Extends to full screen on notched iPhones
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
