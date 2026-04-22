/**
 * Shared latitude/longitude helpers for venue and event location entry.
 */

export const LATITUDE_MIN = -90;
export const LATITUDE_MAX = 90;
export const LONGITUDE_MIN = -180;
export const LONGITUDE_MAX = 180;

const COORDINATE_NUMBER_PATTERN = "[-+]?\\d+(?:\\.\\d+)?";

export interface CoordinatePair {
  lat: number;
  lng: number;
}

export function isValidCoordinateRange(
  coordinates: CoordinatePair | null | undefined,
): coordinates is CoordinatePair {
  return (
    coordinates !== null &&
    coordinates !== undefined &&
    Number.isFinite(coordinates.lat) &&
    coordinates.lat >= LATITUDE_MIN &&
    coordinates.lat <= LATITUDE_MAX &&
    Number.isFinite(coordinates.lng) &&
    coordinates.lng >= LONGITUDE_MIN &&
    coordinates.lng <= LONGITUDE_MAX
  );
}

export function formatCoordinateInput(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "";
  }

  return Number(value.toFixed(6)).toString();
}

export function parseCoordinatePair(
  latValue: string,
  lngValue: string,
): CoordinatePair | null {
  const lat = Number(latValue.trim());
  const lng = Number(lngValue.trim());
  const coordinates = { lat, lng };

  return isValidCoordinateRange(coordinates) ? coordinates : null;
}

function decodeCoordinateText(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function parseCoordinateText(value: string): CoordinatePair | null {
  const normalized = decodeCoordinateText(value.trim())
    .replace(/[，]/g, ",")
    .replace(/\+/g, " ");

  if (!normalized) {
    return null;
  }

  const latMatch = normalized.match(
    new RegExp(
      `\\b(?:lat|latitude)\\s*[:=]\\s*(${COORDINATE_NUMBER_PATTERN})`,
      "i",
    ),
  );
  const lngMatch = normalized.match(
    new RegExp(
      `\\b(?:lng|lon|long|longitude)\\s*[:=]\\s*(${COORDINATE_NUMBER_PATTERN})`,
      "i",
    ),
  );

  if (latMatch?.[1] && lngMatch?.[1]) {
    return parseCoordinatePair(latMatch[1], lngMatch[1]);
  }

  const mapMatch = normalized.match(
    new RegExp(
      `(?:@|(?:^|[?&\\s])(?:q|ll)=)\\s*(${COORDINATE_NUMBER_PATTERN})\\s*,\\s*(${COORDINATE_NUMBER_PATTERN})`,
      "i",
    ),
  );

  if (mapMatch?.[1] && mapMatch?.[2]) {
    return parseCoordinatePair(mapMatch[1], mapMatch[2]);
  }

  const pairMatch = normalized.match(
    new RegExp(
      `^\\s*(${COORDINATE_NUMBER_PATTERN})\\s*,\\s*(${COORDINATE_NUMBER_PATTERN})\\s*$`,
      "i",
    ),
  );

  if (pairMatch?.[1] && pairMatch?.[2]) {
    return parseCoordinatePair(pairMatch[1], pairMatch[2]);
  }

  return null;
}
