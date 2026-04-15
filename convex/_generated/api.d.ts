/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as bandAnalytics from "../bandAnalytics.js";
import type * as bandMediaSlots from "../bandMediaSlots.js";
import type * as bandMembers from "../bandMembers.js";
import type * as bands from "../bands.js";
import type * as eventCohosts from "../eventCohosts.js";
import type * as eventRsvps from "../eventRsvps.js";
import type * as eventTickets from "../eventTickets.js";
import type * as events from "../events.js";
import type * as http from "../http.js";
import type * as messages from "../messages.js";
import type * as migrations from "../migrations.js";
import type * as notifications from "../notifications.js";
import type * as seed from "../seed.js";
import type * as spotify from "../spotify.js";
import type * as spotifyInternal from "../spotifyInternal.js";
import type * as users from "../users.js";
import type * as utils_geo from "../utils/geo.js";
import type * as utils_location from "../utils/location.js";
import type * as utils_permissions from "../utils/permissions.js";
import type * as utils_phone from "../utils/phone.js";
import type * as venues from "../venues.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  bandAnalytics: typeof bandAnalytics;
  bandMediaSlots: typeof bandMediaSlots;
  bandMembers: typeof bandMembers;
  bands: typeof bands;
  eventCohosts: typeof eventCohosts;
  eventRsvps: typeof eventRsvps;
  eventTickets: typeof eventTickets;
  events: typeof events;
  http: typeof http;
  messages: typeof messages;
  migrations: typeof migrations;
  notifications: typeof notifications;
  seed: typeof seed;
  spotify: typeof spotify;
  spotifyInternal: typeof spotifyInternal;
  users: typeof users;
  "utils/geo": typeof utils_geo;
  "utils/location": typeof utils_location;
  "utils/permissions": typeof utils_permissions;
  "utils/phone": typeof utils_phone;
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
