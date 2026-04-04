/**
 * Calculates the distance between two geographic coordinates using the Haversine formula.
 * This formula accounts for the Earth's curvature to provide accurate distance measurements.
 *
 * @param lat1 - Latitude of the first point in decimal degrees
 * @param lng1 - Longitude of the first point in decimal degrees
 * @param lat2 - Latitude of the second point in decimal degrees
 * @param lng2 - Longitude of the second point in decimal degrees
 * @returns Distance between the two points in miles
 *
 * @example
 * // Distance from San Francisco to Oakland
 * calculateDistance(37.7749, -122.4194, 37.8044, -122.2712); // ~8.4 miles
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Converts degrees to radians.
 * Internal helper function for geographic calculations.
 *
 * @param deg - Angle in degrees
 * @returns Angle in radians
 */
function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

const US_COUNTRY_SUFFIX_REGEX =
  /,\s*(?:u\.?\s*s\.?\s*a?\.?|united states(?: of america)?)$/i;

const US_STATE_ABBREVIATIONS: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
  "district of columbia": "DC",
};

function normalizeUsStateSegment(segment: string): string | null {
  const normalized = segment.trim().replace(/\./g, "");
  if (!normalized) {
    return null;
  }

  if (/^[A-Za-z]{2}$/.test(normalized)) {
    return normalized.toUpperCase();
  }

  return US_STATE_ABBREVIATIONS[normalized.toLocaleLowerCase()] ?? null;
}

function normalizeUsLocation(location?: string | null): string {
  const normalized = location
    ?.trim()
    .replace(/\s+/g, " ")
    .replace(US_COUNTRY_SUFFIX_REGEX, "") ?? "";

  if (!normalized) {
    return "";
  }

  const parts = normalized
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length < 2) {
    return normalized;
  }

  const locality = parts.slice(0, -1).join(", ");
  const normalizedState = normalizeUsStateSegment(parts[parts.length - 1]);

  if (!locality || !normalizedState) {
    return normalized;
  }

  return `${locality}, ${normalizedState}`;
}

/**
 * Normalizes a profile location for validation and storage.
 */
export function normalizeProfileLocation(location?: string | null): string {
  return normalizeUsLocation(location);
}

/**
 * Returns true when a profile location has a non-empty value after normalization.
 */
export function hasRequiredProfileLocation(location?: string | null): boolean {
  return normalizeProfileLocation(location).length > 0;
}

/**
 * Returns a user-facing validation error for a missing profile location.
 */
export function getProfileLocationValidationError(
  location?: string | null
): string | null {
  if (!hasRequiredProfileLocation(location)) {
    return "Location is required.";
  }

  return null;
}
