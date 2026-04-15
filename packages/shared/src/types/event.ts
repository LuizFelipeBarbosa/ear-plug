import type { BaseEntity } from "./user";
import type { Genre, Band } from "./band";
import type { Venue } from "./venue";
import type { SpotifyPersonalizationReason } from "./user";

/**
 * Status of an event on a band's calendar.
 * - "confirmed": Event is definitely happening
 * - "hold": Tentative booking, pending confirmation
 * - "available": Open slot, no event booked yet
 */
export type EventStatus = "confirmed" | "hold" | "available";

/**
 * Participation role of a band for a specific event.
 */
export type EventParticipationRole = "host" | "cohost";

/**
 * Visibility setting for event street addresses.
 * - "public": Street address is visible to all fans
 * - "rsvp_only": Street address is shown after RSVP
 */
export type EventAddressVisibility = "public" | "rsvp_only";

/**
 * Guest-list RSVP state managed by bands.
 */
export type GuestRsvpType = "on_list" | "attended";

/**
 * Filter options for guest-list panels.
 */
export type GuestFilterType = "all" | GuestRsvpType;

/**
 * Status for event co-host invites between bands.
 */
export type EventCohostInviteStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "revoked"
  | "expired";

/**
 * One answer option for a gig RSVP poll.
 */
export interface EventPollOption {
  /** Stable option identifier stored on RSVP rows */
  id: string;
  /** User-facing answer label */
  label: string;
}

/**
 * One question within a gig RSVP poll.
 */
export interface EventPollQuestion {
  /** Stable question identifier stored on RSVP rows */
  id: string;
  /** Question shown after RSVP */
  question: string;
  /** Single-choice answer options for this question */
  options: EventPollOption[];
}

/**
 * One selected answer tied to a poll question.
 */
export interface EventPollAnswer {
  /** The question being answered */
  questionId: string;
  /** The selected option for that question */
  optionId: string;
}

/**
 * Optional poll attached to a gig RSVP flow.
 */
export interface EventPoll {
  /** Between 1 and 3 single-choice questions */
  questions: EventPollQuestion[];
}

/**
 * Event entity.
 * Represents a live music show at a venue.
 */
export interface Event extends BaseEntity {
  /** Event title/name */
  title?: string;
  /** ID of the performing band */
  bandId: string;
  /** ID of the venue hosting the event (optional for tentative drafts) */
  venueId?: string;
  /** Unix timestamp (ms) for event start time (optional for tentative drafts) */
  dateTime?: number;
  /** URL to event promotional image */
  image?: string;
  /** Current number of RSVPs */
  rsvpCount: number;
  /** Maximum attendance capacity (optional for tentative drafts) */
  capacity?: number;
  /** Ticket price in cents (0 = free) */
  price?: number;
  /** Event description */
  description?: string;
  /** Music genres for this event */
  genres: Genre[];
  /** @deprecated Legacy single genre field - use genres array instead */
  genre?: Genre;
  /** Current booking status */
  status: EventStatus;
  /** Street-address visibility for fan-facing surfaces */
  addressVisibility?: EventAddressVisibility;
  /** Optional RSVP poll shown to fans after RSVP */
  poll?: EventPoll;
}

/**
 * Event with related band and venue data populated.
 * Used for displaying complete event information in UI.
 */
export interface EventWithDetails extends Event {
  /** The performing band (null if not found) */
  band: Band | null;
  /** The hosting venue (null if not found) */
  venue: Venue | null;
  /** Accepted co-host bands */
  cohostBands?: Band[];
  /** Host + accepted co-host lineup */
  lineupBands?: Band[];
  /** Viewer band participation role when returned from band-scoped queries */
  participationRole?: EventParticipationRole;
  /** Whether venue street address is hidden for the current viewer */
  isVenueAddressHidden?: boolean;
  /** RSVP attendance status when returned from RSVP history payloads */
  attendanceStatus?: GuestRsvpType;
  /** Unix timestamp (ms) when RSVP was marked attended */
  attendedAt?: number;
  /** Optional Spotify taste match reason for fan discover surfaces */
  personalizationReason?: SpotifyPersonalizationReason;
  /** Whether the event poll already has at least one response */
  pollHasResponses?: boolean;
  /** Number of RSVP poll responses currently recorded */
  pollResponseCount?: number;
}

/**
 * RSVP entity.
 * Records a user's intention to attend an event.
 */
export interface RSVP extends BaseEntity {
  /** ID of the user who RSVP'd */
  userId: string;
  /** ID of the event they're attending */
  eventId: string;
  /** Unix timestamp (ms) when RSVP was created */
  createdAt: number;
  /** Attendance status managed by band check-in */
  attendanceStatus?: GuestRsvpType;
  /** Unix timestamp (ms) when RSVP was marked attended */
  attendedAt?: number;
  /** Selected poll answers for the related event poll */
  pollAnswers?: EventPollAnswer[];
  /** Unix timestamp (ms) when the RSVP poll was answered */
  pollAnsweredAt?: number;
}

/**
 * Invitation for one band to co-host a specific event.
 */
export interface EventCohostInvite extends BaseEntity {
  /** Event being co-hosted */
  eventId: string;
  /** Canonical host band */
  hostBandId: string;
  /** Invited co-host band */
  invitedBandId: string;
  /** Band workspace used by inviter */
  invitedByBandId: string;
  /** User who sent the invite */
  invitedByUserId: string;
  /** Invite lifecycle status */
  status: EventCohostInviteStatus;
  /** Unix timestamp (ms) when invite was created */
  createdAt: number;
  /** Unix timestamp (ms) when invite was responded to */
  respondedAt?: number;
  /** Unix timestamp (ms) when pending invite expires */
  expiresAt: number;
}

/**
 * Guest row returned to band guest-management surfaces.
 */
export interface EventGuestListItem {
  /** RSVP document ID */
  rsvpId: string;
  /** Guest user ID */
  userId: string;
  /** Guest display name */
  name: string;
  /** Optional guest avatar URL */
  avatar?: string;
  /** Current RSVP attendance status */
  rsvpType: GuestRsvpType;
  /** Unix timestamp (ms) when RSVP was created */
  rsvpedAt: number;
  /** Unix timestamp (ms) when attendance was marked */
  attendedAt?: number;
}

/**
 * Summary payload for event guest-list preview cards.
 */
export interface EventGuestListSummary {
  /** Total RSVP count for the event */
  totalCount: number;
  /** Preview guests shown on the card */
  previewGuests: Array<{
    rsvpId: string;
    userId: string;
    name: string;
    avatar?: string;
    rsvpType: GuestRsvpType;
  }>;
  /** Whether current viewer can mutate guest attendance/removals */
  canManage: boolean;
}

/**
 * Like entity.
 * Records a user's interest in an event (saved for later).
 */
export interface Like extends BaseEntity {
  /** ID of the user who liked the event */
  userId: string;
  /** ID of the liked event */
  eventId: string;
  /** Unix timestamp (ms) when like was created */
  createdAt: number;
}
