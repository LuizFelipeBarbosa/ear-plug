/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as bandAvailability from "../bandAvailability.js";
import type * as bandListings from "../bandListings.js";
import type * as bands from "../bands.js";
import type * as bookingMessages from "../bookingMessages.js";
import type * as bookings from "../bookings.js";
import type * as events from "../events.js";
import type * as http from "../http.js";
import type * as messages from "../messages.js";
import type * as notifications from "../notifications.js";
import type * as payments from "../payments.js";
import type * as seed from "../seed.js";
import type * as users from "../users.js";
import type * as utils_geo from "../utils/geo.js";
import type * as venues from "../venues.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  bandAvailability: typeof bandAvailability;
  bandListings: typeof bandListings;
  bands: typeof bands;
  bookingMessages: typeof bookingMessages;
  bookings: typeof bookings;
  events: typeof events;
  http: typeof http;
  messages: typeof messages;
  notifications: typeof notifications;
  payments: typeof payments;
  seed: typeof seed;
  users: typeof users;
  "utils/geo": typeof utils_geo;
  venues: typeof venues;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
