import type { BaseEntity } from "./user";

/**
 * Types of notifications that can be sent to users.
 * Each type triggers different display formatting and actions.
 */
export type NotificationType =
  | "event_reminder"              // Reminder for an upcoming RSVP'd event
  | "lineup_change"               // Changes to an event the user is attending
  | "new_event_followed_artist"   // New event from a saved band
  | "new_event_nearby"            // New event at a saved venue
  | "application_update"          // Update on band's application status
  | "message"                     // New message in a conversation
  | "booking_cancelled"           // Booking was canceled
  | "booking_message"             // Booking thread update
  | "booking_accepted"            // Booking accepted
  | "booking_request";            // New booking request

/**
 * Notification entity.
 * Platform notification sent to a user.
 */
export interface Notification extends BaseEntity {
  /** ID of the recipient user */
  userId: string;
  /** Type of notification for formatting/handling */
  type: NotificationType;
  /** Notification headline */
  title: string;
  /** Notification body text */
  content: string;
  /** Unix timestamp (ms) when notification was created */
  timestamp: number;
  /** Whether the user has read the notification */
  read: boolean;
  /** Related event ID (if applicable) */
  eventId?: string;
  /** Related band ID (if applicable) */
  bandId?: string;
  /** Related venue ID (if applicable) */
  venueId?: string;
}
