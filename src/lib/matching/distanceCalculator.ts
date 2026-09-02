export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Major Philippine Tech & Business Hub Coordinates
export const PH_CITY_COORDINATES: Record<string, Coordinates> = {
  "Cebu City": { latitude: 10.3157, longitude: 123.8854 },
  "Mandaue City": { latitude: 10.3340, longitude: 123.9416 },
  "Lapu-Lapu City": { latitude: 10.3103, longitude: 123.9494 },
  "Makati City": { latitude: 14.5547, longitude: 121.0244 },
  "Taguig / BGC": { latitude: 14.5492, longitude: 121.0509 },
  "Quezon City": { latitude: 14.6760, longitude: 121.0437 },
  "Manila": { latitude: 14.5995, longitude: 120.9842 },
  "Pasig City / Ortigas": { latitude: 14.5764, longitude: 121.0851 },
  "Mandaluyong": { latitude: 14.5794, longitude: 121.0359 },
  "Davao City": { latitude: 7.1907, longitude: 125.4553 },
  "Iloilo City": { latitude: 10.7202, longitude: 122.5621 },
  "Cagayan de Oro": { latitude: 8.4542, longitude: 124.6319 },
  "Baguio City": { latitude: 16.4023, longitude: 120.5960 },
  "Angeles City / Clark": { latitude: 15.1450, longitude: 120.5887 },
  "Bacoor / Cavite": { latitude: 14.4624, longitude: 120.9645 },
  "Santa Rosa / Laguna": { latitude: 14.3122, longitude: 121.1114 },
};

/**
 * Calculates geodesic distance between two coordinate pairs in kilometers using the Haversine formula.
 */
export function calculateHaversineDistance(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.latitude)) *
      Math.cos(toRad(coord2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function formatDistance(distanceKm?: number): string {
  if (distanceKm === undefined || distanceKm === null) return "Location Remote / Nationwide";
  if (distanceKm < 1) return "< 1 km away";
  return `${distanceKm.toFixed(1)} km away`;
}
