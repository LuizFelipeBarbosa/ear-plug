import type { BaseEntity } from "./user";

/**
 * Event ticket lifecycle state.
 */
export type TicketStatus = "active" | "used" | "revoked";

/**
 * Role used for event check-in access.
 */
export type EventCheckinAccessRole = "manager" | "staff";

/**
 * Ticket scan mutation result state.
 */
export type EventTicketScanResultStatus =
  | "checked_in"
  | "already_used"
  | "revoked"
  | "invalid";

/**
 * Event ticket entity.
 * One ticket exists for each RSVP row.
 */
export interface EventTicket extends BaseEntity {
  /** Event tied to this ticket */
  eventId: string;
  /** RSVP owning this ticket */
  rsvpId: string;
  /** Ticket holder */
  userId: string;
  /** Opaque one-time token encoded in the QR */
  token: string;
  /** Ticket lifecycle status */
  status: TicketStatus;
  /** Unix timestamp (ms) when ticket was issued */
  issuedAt: number;
  /** Unix timestamp (ms) when ticket was used */
  usedAt?: number;
  /** User who consumed the ticket */
  usedByUserId?: string;
  /** Unix timestamp (ms) when ticket was revoked */
  revokedAt?: number;
  /** Reason code/label for revocation */
  revokedReason?: string;
}

/**
 * Web ticket payload returned to RSVP'd fans.
 */
export interface MyEventTicketPayload {
  eventId: string;
  eventTitle: string;
  eventDateTime: number;
  attendeeName: string;
  venue: {
    name: string;
    address: string;
    city: string;
  } | null;
  requiresTicketBootstrap: boolean;
  ticket: {
    ticketId: string;
    status: TicketStatus;
    issuedAt: number;
    usedAt?: number;
    revokedAt?: number;
    ticketCode: string;
    qrValue?: string;
  } | null;
}

/**
 * Event check-in staff assignment row for management UI.
 */
export interface EventCheckinStaff {
  userId: string;
  name: string;
  avatar?: string;
  assignedAt: number;
  assignedByBandId: string;
}

/**
 * Search result row for assignable event check-in users.
 */
export interface EventCheckinAssignableUser {
  userId: string;
  name: string;
  avatar?: string;
  alreadyAssigned: boolean;
}

/**
 * Ticket scanning response payload.
 */
export interface EventTicketScanResult {
  status: EventTicketScanResultStatus;
  attendeeName?: string;
  usedAt?: number;
  ticketCode?: string;
}
