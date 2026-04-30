/**
 * polyline.ts — Decodes Google's Encoded Polyline format into coordinates.
 *
 * Strava stores GPS routes as "encoded polylines" — a compressed string
 * that represents a series of lat/lng coordinates. For example:
 *   "_p~iF~ps|U" → [[38.5, -120.2], [40.7, -120.95], ...]
 *
 * This is the same format Google Maps uses. We need to decode it
 * so Leaflet can draw the route on a map.
 *
 * Algorithm: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */

export type LatLng = [number, number]; // [latitude, longitude]

/**
 * Decode an encoded polyline string into an array of [lat, lng] pairs.
 *
 * @param encoded — The encoded polyline string from Strava
 * @returns Array of [latitude, longitude] coordinate pairs
 */
export function decodePolyline(encoded: string): LatLng[] {
  const coordinates: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    // Decode latitude
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    // Decode longitude
    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    // Strava uses 5 decimal places of precision
    coordinates.push([lat / 1e5, lng / 1e5]);
  }

  return coordinates;
}

/**
 * Calculate the bounding box of a set of coordinates.
 * Used to automatically zoom the map to fit the entire route.
 */
export function getBounds(
  coordinates: LatLng[]
): { southWest: LatLng; northEast: LatLng } | null {
  if (coordinates.length === 0) return null;

  let minLat = coordinates[0][0];
  let maxLat = coordinates[0][0];
  let minLng = coordinates[0][1];
  let maxLng = coordinates[0][1];

  for (const [lat, lng] of coordinates) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  return {
    southWest: [minLat, minLng],
    northEast: [maxLat, maxLng],
  };
}
