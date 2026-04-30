"use client";

/**
 * RouteMapLazy.tsx — Safe wrapper that loads the map only in the browser.
 *
 * Leaflet uses browser APIs (window, document) that don't exist on the server.
 * next/dynamic with { ssr: false } tells Next.js: "Don't try to render this
 * on the server — only load it in the browser."
 *
 * Usage: import RouteMapLazy from "@/components/maps/RouteMapLazy";
 *        <RouteMapLazy polyline="encoded_string_here" />
 */

import dynamic from "next/dynamic";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

const RouteMapLazy = dynamic(() => import("./RouteMap"), {
  ssr: false, // Only load in the browser, never on the server
  loading: () => (
    <div className="flex h-[300px] items-center justify-center rounded-xl bg-gray-100">
      <LoadingSpinner />
    </div>
  ),
});

export default RouteMapLazy;
