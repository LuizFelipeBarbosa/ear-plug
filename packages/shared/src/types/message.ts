import type { BaseEntity } from "./user";

/**
 * Conversation entity.
 * Represents a messaging thread between a band and venue.
 */
export interface Conversation extends BaseEntity {
  /** ID of the band in the conversation */
  bandId: string;
  /** ID of the venue in the conversation */
  venueId: string;
  /** Unix timestamp (ms) of the most recent message */
  lastMessageAt: number;
  /** Preview text of the last message */
  lastMessagePreview?: string;
}

/**
 * Message entity.
 * A single message within a conversation.
 */
export interface Message extends BaseEntity {
  /** ID of the parent conversation */
  conversationId: string;
  /** ID of the user who sent the message */
  senderId: string;
  /** Message text content */
  content: string;
  /** Unix timestamp (ms) when message was sent */
  timestamp: number;
  /** Whether the recipient has read the message */
  read: boolean;
}
