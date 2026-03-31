import { buildCalendarIcs, type CalendarEventInput } from "@ear-plug/shared/utils";

function sanitizeCalendarFileName(value?: string | null): string {
  const normalized =
    value?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") ??
    "";
  return normalized || "ear-plug-event";
}

export function downloadCalendarInvite(
  input: CalendarEventInput,
  fileName?: string
): void {
  const ics = buildCalendarIcs(input);
  if (!ics) {
    throw new Error("A valid event date is required to add this show to a calendar.");
  }

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = `${sanitizeCalendarFileName(fileName ?? input.title)}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 0);
}
