// Earth's radius in miles
export const EARTH_RADIUS_MILES = 3959;

// Coordinate tolerance for matching (~10 meters)
export const COORDINATE_TOLERANCE = 0.0001;

/**
 * Convert degrees to radians
 */
function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Calculate the distance between two coordinates using the Haversine formula
 * @returns Distance in miles
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MILES * c;
}

/**
 * Check if two coordinates match within the tolerance
 */
export function coordinatesMatch(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  tolerance: number = COORDINATE_TOLERANCE
): boolean {
  const latDiff = Math.abs(lat1 - lat2);
  const lngDiff = Math.abs(lng1 - lng2);
  return latDiff < tolerance && lngDiff < tolerance;
}
