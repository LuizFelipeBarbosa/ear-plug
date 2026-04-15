import type { BaseEntity } from "./user";

/**
 * Role a user can hold within a shared band workspace.
 */
export type BandMemberRole = "owner" | "admin" | "member";

/**
 * Status for existing-user band invites.
 */
export type BandInviteStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "revoked"
  | "expired";

/**
 * Assignability state for band member invites.
 */
export type BandInviteAssignableState =
  | "eligible"
  | "already_member"
  | "pending_invite";

/**
 * Music genre categories supported by the platform.
 * Used for filtering events, matching bands with venues, and user preferences.
 */
export type Genre =
  | "indie"
  | "rock"
  | "jazz"
  | "electronic"
  | "folk"
  | "pop"
  | "alternative";

/**
 * Social media and website links for bands.
 * All fields are optional URLs.
 */
export interface SocialLinks {
  /** Spotify artist profile URL */
  spotify?: string;
  /** Apple Music artist profile URL */
  appleMusic?: string;
  /** Instagram profile URL */
  instagram?: string;
  /** TikTok profile URL */
  tiktok?: string;
  /** YouTube channel URL */
  youtube?: string;
  /** Band's official website URL */
  website?: string;
}

/**
 * Band profile entity.
 * Represents a musical act managed by a musician user.
 */
export interface Band extends BaseEntity {
  /** ID of the musician user who owns this band */
  userId: string;
  /** Band name */
  name: string;
  /** Music genres the band performs (1-5 genres) */
  genres: Genre[];
  /** Band's home location (city/area) */
  location: string;
  /** URL to band's profile/promo image */
  image?: string;
  /** Band biography/description */
  bio?: string;
  /** Number of members in the band */
  memberCount?: number;
  /** Social media and website links */
  socialLinks?: SocialLinks;
  /** Unix timestamp (ms) when band profile was created */
  createdAt: number;
}

/**
 * Membership linking a user to a shared band workspace.
 */
export interface BandMembership extends BaseEntity {
  /** ID of the band workspace */
  bandId: string;
  /** ID of the member user */
  userId: string;
  /** Member role within the workspace */
  role: BandMemberRole;
  /** Unix timestamp (ms) when membership started */
  joinedAt: number;
  /** Optional user who invited this member */
  invitedBy?: string;
}

/**
 * Invitation for an existing user to join a band workspace.
 */
export interface BandInvite extends BaseEntity {
  /** Target band workspace */
  bandId: string;
  /** Existing target user */
  targetUserId: string;
  /** @deprecated Legacy compatibility field. Prefer phoneNumber for invites. */
  email: string;
  /** Target phone number (denormalized, normalized E.164 when available) */
  phoneNumber?: string;
  /** Invited role */
  role: Exclude<BandMemberRole, "owner">;
  /** Invite lifecycle status */
  status: BandInviteStatus;
  /** User who created the invite */
  invitedBy: string;
  /** Unix timestamp (ms) when invite was created */
  createdAt: number;
  /** Unix timestamp (ms) when invite was responded to */
  respondedAt?: number;
  /** Unix timestamp (ms) when pending invite expires */
  expiresAt: number;
}

/**
 * Search result row for assignable band invite users.
 */
export interface BandInviteAssignableUser {
  userId: string;
  name: string;
  avatar?: string;
  inviteState: BandInviteAssignableState;
}

/**
 * Band post media type.
 */
export type BandPostMediaType = "image" | "video";

/**
 * Fixed index for one of six profile media slots.
 */
export type BandMediaSlotIndex = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Stored profile media slot row for band workspace profile.
 */
export interface BandMediaSlot extends BaseEntity {
  /** ID of the owning band */
  bandId: string;
  /** Fixed slot index [0..5] */
  slotIndex: BandMediaSlotIndex;
  /** Convex storage file ID */
  mediaStorageId: string;
  /** Media type for rendering */
  mediaType: BandPostMediaType;
  /** Optional short caption */
  caption?: string;
  /** Optional city-level event location */
  location?: string;
  /** MIME type for uploaded media */
  mimeType: string;
  /** Uploaded file size in bytes */
  fileSizeBytes: number;
  /** Optional duration for video media */
  durationSeconds?: number;
  /** Unix timestamp (ms) when slot row was created */
  createdAt: number;
  /** Unix timestamp (ms) when slot row was last updated */
  updatedAt: number;
}

/**
 * Profile-ready slot DTO used by band workspace UI.
 */
export interface BandProfileMediaSlotView {
  /** Fixed slot index [0..5] */
  slotIndex: BandMediaSlotIndex;
  /** Whether this slot has media assigned */
  isFilled: boolean;
  /** Slot media type, if filled */
  mediaType?: BandPostMediaType;
  /** Resolved media URL for rendering, if filled */
  mediaUrl?: string | null;
  /** Underlying storage ID for caption-only updates */
  mediaStorageId?: string;
  /** Optional short caption */
  caption?: string;
  /** Optional city-level event location */
  location?: string;
  /** Optional duration for video slots */
  durationSeconds?: number;
  /** Whether current viewer can edit slot media */
  canEdit: boolean;
}

/**
 * Band statistics for the musician dashboard.
 * Aggregated metrics about a band's performance.
 */
export interface BandStats {
  /** Number of shows performed this calendar month */
  showsThisMonth: number;
  /** Total RSVPs across all events */
  totalRsvps: number;
  /** Number of fans who have saved the band */
  newFans: number;
}

/**
 * Analytics data for band performance charts.
 * Used to render dashboard visualizations.
 */
export interface AnalyticsData {
  /** Total RSVPs across all time */
  totalRsvps: number;
  /** Total number of events */
  eventCount: number;
  /** Average checked-in attendance for past shows */
  averageAttendancePerShow: number;
  /** Best attendance show (checked-in attendees) */
  bestAttendanceShow: {
    /** Event document ID */
    eventId: string;
    /** Event title */
    eventName: string;
    /** Venue name */
    venueName: string;
    /** Event date timestamp (ms) */
    dateTime: number;
    /** Checked-in attendee count */
    attended: number;
  } | null;
  /** Lowest attendance show (checked-in attendees) */
  lowestShow: {
    /** Event document ID */
    eventId: string;
    /** Event title */
    eventName: string;
    /** Venue name */
    venueName: string;
    /** Event date timestamp (ms) */
    dateTime: number;
    /** Checked-in attendee count */
    attended: number;
  } | null;
  /** Event-by-event comparison data for charts */
  eventComparison: {
    /** Display name (formatted date) */
    name: string;
    /** Number of RSVPs for this event */
    rsvps: number;
    /** Number of checked-in attendees for this event */
    attended: number;
    /** Name of the venue */
    venueName: string;
  }[];
  /** Traffic source breakdown for pie chart */
  trafficData: {
    /** Traffic source name */
    name: string;
    /** Absolute audience total */
    value: number;
  }[];
  /** Rollup of audience locations pulled from fan profiles */
  locationSummary: {
    /** Number of unique profile locations represented in the analytics set */
    trackedLocationCount: number;
    /** Number of unique fans with a saved location */
    locatedFanCount: number;
    /** Number of unique fans missing a saved location */
    fansWithoutLocationCount: number;
    /** Largest audience location, or null when nothing is mapped yet */
    topLocation: {
      /** Audience location label */
      location: string;
      /** Unique fans from this location */
      fanCount: number;
      /** Total RSVPs contributed by those fans */
      rsvpCount: number;
      /** Total attended check-ins contributed by those fans */
      attendedCount: number;
      /** Share of mapped fans from this location */
      share: number;
    } | null;
  };
  /** Ranked audience locations derived from fan profile locations */
  locationBreakdown: {
    /** Audience location label */
    location: string;
    /** Unique fans from this location */
    fanCount: number;
    /** Total RSVPs contributed by those fans */
    rsvpCount: number;
    /** Total attended check-ins contributed by those fans */
    attendedCount: number;
    /** Share of mapped fans from this location */
    share: number;
  }[];
  /** Aggregate poll participation across polled gigs */
  pollSummary: {
    /** Number of gigs that currently have a poll configured */
    polledGigCount: number;
    /** Total RSVP poll responses across polled gigs */
    totalResponses: number;
    /** Average poll response rate across polled gigs */
    averageResponseRate: number;
  };
  /** Single highlighted poll for dashboard surfaces */
  pollSnapshot: {
    /** Event document id */
    eventId: string;
    /** Event title */
    eventTitle: string;
    /** Event date timestamp (ms) */
    dateTime: number;
    /** Number of RSVP poll responses */
    responseCount: number;
    /** Number of RSVPs eligible to answer */
    eligibleRsvpCount: number;
    /** Poll response rate as a percentage */
    responseRate: number;
    /** Per-question answer distributions for the highlighted poll */
    questions: {
      /** Question id */
      id: string;
      /** Poll question */
      question: string;
      /** Top answer option, or null when there are no answers yet */
      topOption: {
        /** Option id */
        id: string;
        /** Option label */
        label: string;
        /** Number of responses choosing this option */
        count: number;
        /** Share of responses choosing this option */
        percentage: number;
      } | null;
      /** Option-level counts and percentages */
      options: {
        /** Option id */
        id: string;
        /** Option label */
        label: string;
        /** Number of responses */
        count: number;
        /** Share of responses for this option */
        percentage: number;
      }[];
    }[];
  } | null;
  /** Recent polled gigs with option-level answer distributions */
  pollBreakdown: {
    /** Event document id */
    eventId: string;
    /** Event title */
    eventTitle: string;
    /** Event date timestamp (ms) */
    dateTime: number;
    /** Number of RSVP poll responses */
    responseCount: number;
    /** Number of RSVPs eligible to answer */
    eligibleRsvpCount: number;
    /** Poll response rate as a percentage */
    responseRate: number;
    /** Per-question answer distributions */
    questions: {
      /** Question id */
      id: string;
      /** Poll question */
      question: string;
      /** Option-level counts and percentages */
      options: {
        /** Option id */
        id: string;
        /** Option label */
        label: string;
        /** Number of responses */
        count: number;
        /** Share of responses for this option */
        percentage: number;
      }[];
    }[];
  }[];
}
