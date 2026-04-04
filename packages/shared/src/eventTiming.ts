/**
 * Fan-facing event timing helpers.
 *
 * RSVP stays open for a short window after the scheduled start time so
 * late arrivals can still join the guest list.
 */
export const EVENT_RSVP_GRACE_PERIOD_MS = 4 * 60 * 60 * 1000;

export function getEventRsvpCutoff(dateTime: number): number {
  return dateTime + EVENT_RSVP_GRACE_PERIOD_MS;
}

export function isEventRsvpWindowOpen(
  dateTime: number,
  now: number = Date.now(),
): boolean {
  return Number.isFinite(dateTime) && getEventRsvpCutoff(dateTime) > now;
}

export function isEventPast(
  dateTime: number,
  now: number = Date.now(),
): boolean {
  return !isEventRsvpWindowOpen(dateTime, now);
}
