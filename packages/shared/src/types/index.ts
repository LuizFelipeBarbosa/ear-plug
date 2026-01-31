// User role types
export type UserRole = "fan" | "musician";

// Genre types
export type Genre =
  | "indie"
  | "rock"
  | "jazz"
  | "electronic"
  | "folk"
  | "pop"
  | "alternative";

// Event status types
export type EventStatus = "confirmed" | "hold" | "available";

// Open date status
export type OpenDateStatus = "open" | "pending" | "filled";

// Application status
export type ApplicationStatus = "pending" | "accepted" | "rejected";

// Notification types
export type NotificationType =
  | "event_reminder"
  | "lineup_change"
  | "new_event_followed_artist"
  | "new_event_nearby"
  | "application_update"
  | "message";

// Coordinates
export interface Coordinates {
  lat: number;
  lng: number;
}

// Social links structure
export interface SocialLinks {
  spotify?: string;
  appleMusic?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  website?: string;
}

// Base entity with ID
export interface BaseEntity {
  _id: string;
  _creationTime: number;
}

// User entity
export interface User extends BaseEntity {
  clerkId: string;
  role: UserRole;
  name: string;
  email: string;
  location?: string;
  avatar?: string;
  topGenres?: Genre[];
  memberSince: number;
  showsAttended?: number;
}

// Band entity
export interface Band extends BaseEntity {
  userId: string;
  name: string;
  genres: Genre[];
  location: string;
  image?: string;
  bio?: string;
  memberCount?: number;
  socialLinks?: SocialLinks;
  createdAt: number;
}

// Venue entity
export interface Venue extends BaseEntity {
  name: string;
  address: string;
  city: string;
  capacity: number;
  coordinates: Coordinates;
  images?: string[];
  description?: string;
  genres?: Genre[];
}

// Event entity
export interface Event extends BaseEntity {
  title: string;
  bandId: string;
  venueId: string;
  dateTime: number;
  image?: string;
  rsvpCount: number;
  capacity: number;
  price?: number;
  description?: string;
  genres: Genre[]; // Multiple genres supported
  genre?: Genre; // Legacy single genre field - kept for backward compatibility
  status: EventStatus;
}

// Event with related data
export interface EventWithDetails extends Event {
  band: Band | null;
  venue: Venue | null;
}

// RSVP entity
export interface RSVP extends BaseEntity {
  userId: string;
  eventId: string;
  createdAt: number;
}

// Like entity
export interface Like extends BaseEntity {
  userId: string;
  eventId: string;
  createdAt: number;
}

// Conversation entity
export interface Conversation extends BaseEntity {
  bandId: string;
  venueId: string;
  lastMessageAt: number;
  lastMessagePreview?: string;
}

// Message entity
export interface Message extends BaseEntity {
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: number;
  read: boolean;
}

// Notification entity
export interface Notification extends BaseEntity {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  timestamp: number;
  read: boolean;
  eventId?: string;
  bandId?: string;
  venueId?: string;
}

// Open date entity
export interface OpenDate extends BaseEntity {
  venueId: string;
  date: number;
  offeredPay?: number;
  genre?: Genre;
  status: OpenDateStatus;
  description?: string;
  createdAt: number;
}

// Application entity
export interface Application extends BaseEntity {
  bandId: string;
  openDateId: string;
  status: ApplicationStatus;
  message?: string;
  appliedAt: number;
  respondedAt?: number;
}

// Band stats for dashboard
export interface BandStats {
  showsThisMonth: number;
  totalRsvps: number;
  newFans: number;
}

// Analytics data
export interface AnalyticsData {
  totalRsvps: number;
  eventCount: number;
  eventComparison: {
    name: string;
    rsvps: number;
    venueName: string;
  }[];
  trafficData: {
    name: string;
    value: number;
  }[];
}

// Map filter options
export interface MapFilters {
  genre?: Genre;
  radiusMiles?: number;
  searchQuery?: string;
}
