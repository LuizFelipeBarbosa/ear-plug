import type { BaseEntity } from "./user";
import type { Genre } from "./band";

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
