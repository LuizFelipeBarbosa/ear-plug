import { formatEventDate, formatEventTime, formatPrice, getRelativeTime } from "@ear-plug/shared/constants";

export { formatEventDate, formatEventTime, formatPrice, getRelativeTime };

export function formatFullDateTime(timestamp: number): string {
  return `${formatEventDate(timestamp)} ${formatEventTime(timestamp)}`;
}
