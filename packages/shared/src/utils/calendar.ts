export interface CalendarEventInput {
  title?: string | null;
  startsAt?: number | null;
  endsAt?: number | null;
  durationMinutes?: number | null;
  description?: string | null;
  location?: string | null;
  url?: string | null;
}

export interface ResolvedCalendarEvent {
  title: string;
  startsAt: number;
  endsAt: number;
  description: string;
  location: string;
}

export const DEFAULT_CALENDAR_EVENT_DURATION_MINUTES = 180;

function normalizeCalendarText(value?: string | null): string {
  return value?.trim().replace(/\r\n/g, "\n").replace(/\s+\n/g, "\n") ?? "";
}

function formatCalendarUtcTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

export function resolveCalendarEvent(
  input: CalendarEventInput
): ResolvedCalendarEvent | null {
  if (typeof input.startsAt !== "number" || !Number.isFinite(input.startsAt)) {
    return null;
  }

  const startsAt = input.startsAt;
  const durationMinutes =
    typeof input.durationMinutes === "number" && input.durationMinutes > 0
      ? input.durationMinutes
      : DEFAULT_CALENDAR_EVENT_DURATION_MINUTES;
  const endsAt =
    typeof input.endsAt === "number" &&
    Number.isFinite(input.endsAt) &&
    input.endsAt > startsAt
      ? input.endsAt
      : startsAt + durationMinutes * 60 * 1000;

  const descriptionParts = [
    normalizeCalendarText(input.description),
    normalizeCalendarText(input.url),
  ].filter(Boolean);

  return {
    title: normalizeCalendarText(input.title) || "Ear-Plug Event",
    startsAt,
    endsAt,
    description: descriptionParts.join("\n\n"),
    location: normalizeCalendarText(input.location),
  };
}

export function buildGoogleCalendarUrl(
  input: CalendarEventInput
): string | null {
  const event = resolveCalendarEvent(input);
  if (!event) {
    return null;
  }

  const params = [
    ["action", "TEMPLATE"],
    ["text", event.title],
    [
      "dates",
      `${formatCalendarUtcTimestamp(event.startsAt)}/${formatCalendarUtcTimestamp(
        event.endsAt
      )}`,
    ],
    ["details", event.description],
    ["location", event.location],
  ]
    .filter(([, value]) => value)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    )
    .join("&");

  return `https://calendar.google.com/calendar/render?${params}`;
}

export function buildCalendarIcs(input: CalendarEventInput): string | null {
  const event = resolveCalendarEvent(input);
  if (!event) {
    return null;
  }

  const uid = `ear-plug-${event.startsAt}-${Math.random()
    .toString(36)
    .slice(2, 10)}@earplug.local`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ear-Plug//Listen Local//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatCalendarUtcTimestamp(Date.now())}`,
    `DTSTART:${formatCalendarUtcTimestamp(event.startsAt)}`,
    `DTEND:${formatCalendarUtcTimestamp(event.endsAt)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    "STATUS:CONFIRMED",
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}
