/**
 * @fileoverview Type definitions for the Ear-Plug platform.
 * Contains all shared TypeScript types and interfaces used across web and mobile apps.
 * @module @ear-plug/shared/types
 */

/**
 * User role type for the platform.
 * Determines the user's experience and available features.
 * - "fan": Music fan who discovers events, RSVPs, and follows bands
 * - "musician": Band member who manages their band profile and events
 */
export type UserRole = "fan" | "musician";

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
 * Status of an event on a band's calendar.
 * - "confirmed": Event is definitely happening
 * - "hold": Tentative booking, pending confirmation
 * - "available": Open slot, no event booked yet
 */
export type EventStatus = "confirmed" | "hold" | "available";

/**
 * Status of an open date at a venue.
 * - "open": Available for band applications
 * - "pending": Applications received, under review
 * - "filled": A band has been selected and confirmed
 */
export type OpenDateStatus = "open" | "pending" | "filled";

/**
 * Status of a band's application to an open date.
 * - "pending": Application submitted, awaiting venue response
 * - "accepted": Venue accepted the band for the date
 * - "rejected": Venue declined the application
 */
export type ApplicationStatus = "pending" | "accepted" | "rejected";

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
  // Booking marketplace notification types
  | "booking_request"             // New booking request from fan
  | "booking_accepted"            // Band accepted booking
  | "booking_rejected"            // Band rejected booking
  | "booking_cancelled"           // Booking was cancelled
  | "deposit_received"            // Deposit payment received
  | "payment_received"            // Full payment received
  | "booking_reminder"            // Reminder about upcoming booked event
  | "booking_message";            // New message in booking conversation

// ============================================================================
// MARKETPLACE TYPES
// ============================================================================

/**
 * Types of events for marketplace bookings.
 */
export type MarketplaceEventType =
  | "wedding"
  | "corporate"
  | "private_party"
  | "public_gig"
  | "festival"
  | "other";

/**
 * Status of a booking request.
 */
export type BookingStatus =
  | "pending"        // Initial request, awaiting band response
  | "negotiating"    // Band and fan discussing terms
  | "accepted"       // Band accepted, waiting for deposit
  | "deposit_paid"   // Deposit paid, booking secured
  | "confirmed"      // Fully paid and confirmed
  | "completed"      // Event has occurred
  | "cancelled"      // Cancelled by either party
  | "rejected"       // Band declined the request
  | "expired";       // Request timed out

/**
 * Status of a band marketplace listing.
 */
export type ListingStatus =
  | "draft"     // Not yet published
  | "active"    // Live and accepting bookings
  | "paused"    // Temporarily not accepting
  | "archived"; // No longer active

/**
 * Status of a band availability slot.
 */
export type AvailabilityStatus =
  | "available" // Open for booking
  | "booked"    // Slot has been booked
  | "blocked";  // Manually blocked by band

/**
 * Types of messages in booking conversations.
 */
export type BookingMessageType =
  | "text"          // Regular text message
  | "quote_update"  // Price/quote change
  | "system";       // Automated system message

/**
 * Types of payment transactions.
 */
export type TransactionType =
  | "deposit"        // Initial deposit payment
  | "final_payment"  // Remaining balance
  | "refund";        // Money returned to fan

/**
 * Status of a payment transaction.
 */
export type TransactionStatus =
  | "pending"   // Payment initiated
  | "succeeded" // Completed successfully
  | "failed"    // Payment failed
  | "refunded"; // Has been refunded

/**
 * Geographic coordinates for mapping and distance calculations.
 */
export interface Coordinates {
  /** Latitude in decimal degrees (-90 to 90) */
  lat: number;
  /** Longitude in decimal degrees (-180 to 180) */
  lng: number;
}

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
 * Base interface for all database entities.
 * Provides common fields from Convex document storage.
 */
export interface BaseEntity {
  /** Unique document ID from Convex */
  _id: string;
  /** Unix timestamp (ms) when the document was created */
  _creationTime: number;
}

/**
 * User profile entity.
 * Linked to Clerk authentication and stores platform-specific user data.
 */
export interface User extends BaseEntity {
  /** Clerk authentication user ID */
  clerkId: string;
  /** User's role determining their experience */
  role: UserRole;
  /** User's display name */
  name: string;
  /** User's email address */
  email: string;
  /** User's location (city/area) */
  location?: string;
  /** URL to user's avatar image */
  avatar?: string;
  /** User's preferred music genres (max 5) */
  topGenres?: Genre[];
  /** Unix timestamp (ms) when user joined */
  memberSince: number;
  /** Number of shows the user has attended */
  showsAttended?: number;
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
 * Venue entity.
 * Represents a Bay Area live music venue.
 */
export interface Venue extends BaseEntity {
  /** Venue name */
  name: string;
  /** Street address */
  address: string;
  /** City name */
  city: string;
  /** Maximum capacity for events */
  capacity: number;
  /** Geographic coordinates for mapping */
  coordinates: Coordinates;
  /** URLs to venue photos */
  images?: string[];
  /** Venue description */
  description?: string;
  /** Music genres typically hosted */
  genres?: Genre[];
}

/**
 * Event entity.
 * Represents a live music show at a venue.
 */
export interface Event extends BaseEntity {
  /** Event title/name */
  title: string;
  /** ID of the performing band */
  bandId: string;
  /** ID of the venue hosting the event */
  venueId: string;
  /** Unix timestamp (ms) for event start time */
  dateTime: number;
  /** URL to event promotional image */
  image?: string;
  /** Current number of RSVPs */
  rsvpCount: number;
  /** Maximum attendance capacity */
  capacity: number;
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

/**
 * Open date entity.
 * Represents an available booking slot at a venue.
 */
export interface OpenDate extends BaseEntity {
  /** ID of the venue offering the date */
  venueId: string;
  /** Unix timestamp (ms) for the available date */
  date: number;
  /** Compensation offered in cents */
  offeredPay?: number;
  /** Preferred genre for the date */
  genre?: Genre;
  /** Current status of the open date */
  status: OpenDateStatus;
  /** Additional requirements or notes */
  description?: string;
  /** Unix timestamp (ms) when open date was posted */
  createdAt: number;
}

/**
 * Application entity.
 * A band's application to perform on an open date.
 */
export interface Application extends BaseEntity {
  /** ID of the applying band */
  bandId: string;
  /** ID of the open date being applied to */
  openDateId: string;
  /** Current application status */
  status: ApplicationStatus;
  /** Band's message to the venue */
  message?: string;
  /** Unix timestamp (ms) when application was submitted */
  appliedAt: number;
  /** Unix timestamp (ms) when venue responded */
  respondedAt?: number;
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
  /** Event-by-event comparison data for charts */
  eventComparison: {
    /** Display name (formatted date) */
    name: string;
    /** Number of RSVPs for this event */
    rsvps: number;
    /** Name of the venue */
    venueName: string;
  }[];
  /** Traffic source breakdown for pie chart */
  trafficData: {
    /** Traffic source name */
    name: string;
    /** Percentage value */
    value: number;
  }[];
}

/**
 * Filter options for the event discovery map.
 * Used to narrow down displayed events.
 */
export interface MapFilters {
  /** Filter by music genre */
  genre?: Genre;
  /** Maximum distance from user location in miles */
  radiusMiles?: number;
  /** Text search query for event/band/venue names */
  searchQuery?: string;
}

// ============================================================================
// MARKETPLACE ENTITIES
// ============================================================================

/**
 * Add-on service offered by a band.
 */
export interface BandListingAddOn {
  /** Add-on name */
  name: string;
  /** Description of the add-on */
  description?: string;
  /** Price in cents */
  priceInCents: number;
}

/**
 * Band marketplace listing entity.
 * Contains pricing, availability settings, and supported event types.
 */
export interface BandListing extends BaseEntity {
  /** ID of the band */
  bandId: string;
  /** Listing title/headline */
  title: string;
  /** Detailed description */
  description?: string;
  /** Supported event types */
  eventTypes: MarketplaceEventType[];
  /** Base hourly rate in cents */
  baseHourlyRate: number;
  /** Minimum booking hours */
  minimumHours: number;
  /** Deposit percentage (0-100) */
  depositPercentage: number;
  /** Optional add-on services */
  addOns?: BandListingAddOn[];
  /** Maximum travel distance in miles */
  maxTravelDistance?: number;
  /** Additional booking notes */
  bookingNotes?: string;
  /** Cancellation policy text */
  cancellationPolicy?: string;
  /** Current listing status */
  status: ListingStatus;
  /** Unix timestamp (ms) when created */
  createdAt: number;
  /** Unix timestamp (ms) when last updated */
  updatedAt: number;
}

/**
 * Band listing with band data populated.
 */
export interface BandListingWithBand extends BandListing {
  /** The band this listing belongs to */
  band: Band;
}

/**
 * Band availability slot entity.
 */
export interface BandAvailability extends BaseEntity {
  /** ID of the band */
  bandId: string;
  /** ID of the listing */
  listingId: string;
  /** Start date/time (Unix timestamp ms) */
  startDateTime: number;
  /** End date/time (Unix timestamp ms) */
  endDateTime: number;
  /** Slot status */
  status: AvailabilityStatus;
  /** ID of booking if slot is booked */
  bookingId?: string;
  /** Notes for blocked slots */
  notes?: string;
  /** Unix timestamp (ms) when created */
  createdAt: number;
}

/**
 * Booking request entity.
 */
export interface Booking extends BaseEntity {
  /** ID of the fan who made the booking */
  fanId: string;
  /** ID of the band being booked */
  bandId: string;
  /** ID of the band's listing */
  listingId: string;
  /** Type of event */
  eventType: MarketplaceEventType;
  /** Event name/title */
  eventName: string;
  /** Event description */
  eventDescription?: string;
  /** Event date/time (Unix timestamp ms) */
  eventDateTime: number;
  /** Duration in hours */
  durationHours: number;
  /** Event location/address */
  eventLocation: string;
  /** Event city */
  eventCity?: string;
  /** Expected number of guests */
  guestCount?: number;
  /** Selected add-on names */
  selectedAddOns?: string[];
  /** Special requests */
  specialRequests?: string;
  /** Total price in cents */
  totalPriceInCents: number;
  /** Deposit amount in cents */
  depositAmountInCents: number;
  /** Amount paid so far in cents */
  paidAmountInCents: number;
  /** Current booking status */
  status: BookingStatus;
  /** Reason for cancellation/rejection */
  statusReason?: string;
  /** Unix timestamp (ms) when requested */
  requestedAt: number;
  /** Unix timestamp (ms) when band responded */
  respondedAt?: number;
  /** Unix timestamp (ms) when deposit was paid */
  depositPaidAt?: number;
  /** Unix timestamp (ms) when final payment was made */
  finalPaymentAt?: number;
  /** Unix timestamp (ms) when confirmed */
  confirmedAt?: number;
  /** Unix timestamp (ms) when completed */
  completedAt?: number;
  /** Unix timestamp (ms) when cancelled */
  cancelledAt?: number;
}

/**
 * Booking with related data populated.
 */
export interface BookingWithDetails extends Booking {
  /** The band being booked */
  band: Band | null;
  /** The fan who made the booking */
  fan: User | null;
  /** The band's listing */
  listing: BandListing | null;
}

/**
 * Booking conversation entity.
 */
export interface BookingConversation extends BaseEntity {
  /** ID of the booking */
  bookingId: string;
  /** ID of the fan */
  fanId: string;
  /** ID of the band */
  bandId: string;
  /** Unix timestamp (ms) of last message */
  lastMessageAt: number;
  /** Preview of last message */
  lastMessagePreview?: string;
  /** Unread count for fan */
  fanUnreadCount: number;
  /** Unread count for band */
  bandUnreadCount: number;
}

/**
 * Booking message entity.
 */
export interface BookingMessage extends BaseEntity {
  /** ID of the conversation */
  conversationId: string;
  /** ID of the sender */
  senderId: string;
  /** Message content */
  content: string;
  /** Message type */
  messageType: BookingMessageType;
  /** For quote updates: new price in cents */
  newPriceInCents?: number;
  /** Unix timestamp (ms) when sent */
  timestamp: number;
  /** Whether the message has been read */
  read: boolean;
}

/**
 * Payment transaction entity.
 */
export interface Transaction extends BaseEntity {
  /** ID of the booking */
  bookingId: string;
  /** Transaction type */
  type: TransactionType;
  /** Amount in cents */
  amountInCents: number;
  /** Stripe PaymentIntent ID */
  stripePaymentIntentId?: string;
  /** Stripe Charge ID */
  stripeChargeId?: string;
  /** Stripe Refund ID */
  stripeRefundId?: string;
  /** Transaction status */
  status: TransactionStatus;
  /** Error message if failed */
  errorMessage?: string;
  /** Unix timestamp (ms) when created */
  createdAt: number;
  /** Unix timestamp (ms) when last updated */
  updatedAt: number;
}
