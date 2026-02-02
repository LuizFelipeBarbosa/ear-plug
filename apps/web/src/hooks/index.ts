/**
 * @fileoverview Barrel export file for all custom hooks.
 * Provides a single import point for hook consumers.
 * @module hooks
 *
 * @example
 * import {
 *   useCurrentUser,
 *   useEvents,
 *   useCurrentBand,
 *   useVenues,
 *   useBandConversations,
 *   useNotifications,
 *   useLocalStorage,
 *   useGeolocation,
 *   useSharedEvents
 * } from "@/hooks";
 */

export * from "./useUser";
export * from "./useEvents";
export * from "./useBand";
export * from "./useVenues";
export * from "./useMessages";
export * from "./useNotifications";
export * from "./useLocalStorage";
export * from "./useGeolocation";
export * from "./useSharedEvents";
export { useBandEvents } from "./useSharedEvents";
// Marketplace hooks
export * from "./useBandListing";
export * from "./useBookings";
