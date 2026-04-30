"use client";

/**
 * RouteMap.tsx — Displays an activity's GPS route on a Leaflet map.
 *
 * This is the INNER component that contains the actual Leaflet code.
 * It should NOT be imported directly — use RouteMapLazy instead.
 *
 * Why? Leaflet uses browser APIs (window, document) that don't exist
 * on the server. If Next.js tries to render this on the server, it crashes.
 * RouteMapLazy wraps this with next/dynamic to load it client-side only.
 */

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { decodePolyline, getBounds } from "@/lib/polyline";

interface RouteMapProps {
  /** Encoded polyline string from Strava */
  polyline: string;
  /** Height of the map container (default: 300px) */
  height?: number;
}

export default function RouteMap({ polyline, height = 300 }: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Decode the polyline into coordinates
    const coordinates = decodePolyline(polyline);
    if (coordinates.length === 0) return;

    // Calculate bounds to fit the entire route
    const bounds = getBounds(coordinates);
    if (!bounds) return;

    // Create the Leaflet map
    const map = L.map(mapRef.current, {
      // Mobile-friendly settings
      zoomControl: true,
      scrollWheelZoom: false, // Prevent accidental zoom while scrolling
      dragging: true,
      touchZoom: true,
      doubleClickZoom: true,
    });

    mapInstanceRef.current = map;

    // Add OpenStreetMap tiles (free, no API key needed)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Draw the route as a blue line
    const routeLine = L.polyline(coordinates, {
      color: "#3B82F6", // Blue-500
      weight: 4,
      opacity: 0.8,
      smoothFactor: 1,
    }).addTo(map);

    // Add start marker (green)
    const startIcon = L.divIcon({
      html: '<div style="width:12px;height:12px;background:#22C55E;border:2px solid white;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>',
      iconSize: [12, 12],
      iconAnchor: [6, 6],
      className: "",
    });
    L.marker(coordinates[0], { icon: startIcon }).addTo(map);

    // Add end marker (red)
    const endIcon = L.divIcon({
      html: '<div style="width:12px;height:12px;background:#EF4444;border:2px solid white;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>',
      iconSize: [12, 12],
      iconAnchor: [6, 6],
      className: "",
    });
    L.marker(coordinates[coordinates.length - 1], { icon: endIcon }).addTo(map);

    // Fit the map to show the entire route with some padding
    map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });

    // Cleanup when component unmounts
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [polyline]);

  return (
    <div
      ref={mapRef}
      style={{ height: `${height}px` }}
      className="w-full rounded-xl overflow-hidden"
    />
  );
}
