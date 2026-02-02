/**
 * @fileoverview Convex queries and mutations for band availability management.
 * Handles setting available dates, blocking dates, and checking availability.
 * @module convex/bandAvailability
 */

import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";

/** Validator for availability status */
const availabilityStatusValidator = v.union(
  v.literal("available"),
  v.literal("booked"),
  v.literal("blocked")
);

/**
 * Sets availability for a band on specific dates/times.
 * Creates availability slots that fans can book.
 *
 * @param bandId - The ID of the band
 * @param listingId - The ID of the band's listing
 * @param slots - Array of time slots to mark as available
 * @returns Array of created availability document IDs
 * @throws Error if not authenticated, band not found, or user doesn't own the band
 */
export const setAvailability = mutation({
  args: {
    bandId: v.id("bands"),
    listingId: v.id("bandListings"),
    slots: v.array(
      v.object({
        startDateTime: v.number(),
        endDateTime: v.number(),
        notes: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const band = await ctx.db.get(args.bandId);
    if (!band) {
      throw new Error("Band not found");
    }

    if (band.userId !== user._id) {
      throw new Error("You don't own this band");
    }

    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.bandId !== args.bandId) {
      throw new Error("Listing not found or doesn't belong to this band");
    }

    const now = Date.now();
    const createdIds: string[] = [];

    for (const slot of args.slots) {
      // Validate slot times
      if (slot.endDateTime <= slot.startDateTime) {
        throw new Error("End time must be after start time");
      }

      if (slot.startDateTime < now) {
        throw new Error("Cannot set availability in the past");
      }

      // Check for overlapping slots
      const overlapping = await ctx.db
        .query("bandAvailability")
        .withIndex("by_band", (q) => q.eq("bandId", args.bandId))
        .filter((q) =>
          q.and(
            q.lt(q.field("startDateTime"), slot.endDateTime),
            q.gt(q.field("endDateTime"), slot.startDateTime)
          )
        )
        .first();

      if (overlapping) {
        throw new Error(
          `Time slot overlaps with existing availability from ${new Date(overlapping.startDateTime).toISOString()}`
        );
      }

      const id = await ctx.db.insert("bandAvailability", {
        bandId: args.bandId,
        listingId: args.listingId,
        startDateTime: slot.startDateTime,
        endDateTime: slot.endDateTime,
        status: "available",
        notes: slot.notes,
        createdAt: now,
      });

      createdIds.push(id);
    }

    return createdIds;
  },
});

/**
 * Blocks dates for a band (e.g., vacation, other commitments).
 * Blocked dates cannot be booked by fans.
 *
 * @param bandId - The ID of the band
 * @param listingId - The ID of the band's listing
 * @param startDateTime - Start of blocked period
 * @param endDateTime - End of blocked period
 * @param notes - Optional reason for blocking
 * @returns The created blocked slot document ID
 * @throws Error if not authenticated, band not found, or user doesn't own the band
 */
export const blockDates = mutation({
  args: {
    bandId: v.id("bands"),
    listingId: v.id("bandListings"),
    startDateTime: v.number(),
    endDateTime: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const band = await ctx.db.get(args.bandId);
    if (!band) {
      throw new Error("Band not found");
    }

    if (band.userId !== user._id) {
      throw new Error("You don't own this band");
    }

    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.bandId !== args.bandId) {
      throw new Error("Listing not found or doesn't belong to this band");
    }

    if (args.endDateTime <= args.startDateTime) {
      throw new Error("End time must be after start time");
    }

    // Check for conflicting booked slots
    const conflictingBooked = await ctx.db
      .query("bandAvailability")
      .withIndex("by_band", (q) => q.eq("bandId", args.bandId))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "booked"),
          q.lt(q.field("startDateTime"), args.endDateTime),
          q.gt(q.field("endDateTime"), args.startDateTime)
        )
      )
      .first();

    if (conflictingBooked) {
      throw new Error("Cannot block dates with existing confirmed bookings");
    }

    // Delete any available slots that overlap
    const overlappingAvailable = await ctx.db
      .query("bandAvailability")
      .withIndex("by_band", (q) => q.eq("bandId", args.bandId))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "available"),
          q.lt(q.field("startDateTime"), args.endDateTime),
          q.gt(q.field("endDateTime"), args.startDateTime)
        )
      )
      .collect();

    for (const slot of overlappingAvailable) {
      await ctx.db.delete(slot._id);
    }

    return await ctx.db.insert("bandAvailability", {
      bandId: args.bandId,
      listingId: args.listingId,
      startDateTime: args.startDateTime,
      endDateTime: args.endDateTime,
      status: "blocked",
      notes: args.notes,
      createdAt: Date.now(),
    });
  },
});

/**
 * Checks if a band is available for a specific date/time range.
 *
 * @param bandId - The ID of the band
 * @param startDateTime - Start of requested period
 * @param endDateTime - End of requested period
 * @returns Object with availability status and any conflicting slots
 */
export const checkAvailability = query({
  args: {
    bandId: v.id("bands"),
    startDateTime: v.number(),
    endDateTime: v.number(),
  },
  handler: async (ctx, args) => {
    // Check for blocked or booked slots that overlap
    const conflictingSlots = await ctx.db
      .query("bandAvailability")
      .withIndex("by_band", (q) => q.eq("bandId", args.bandId))
      .filter((q) =>
        q.and(
          q.or(
            q.eq(q.field("status"), "blocked"),
            q.eq(q.field("status"), "booked")
          ),
          q.lt(q.field("startDateTime"), args.endDateTime),
          q.gt(q.field("endDateTime"), args.startDateTime)
        )
      )
      .collect();

    if (conflictingSlots.length > 0) {
      return {
        available: false,
        reason:
          conflictingSlots[0].status === "booked"
            ? "Band is already booked during this time"
            : "Band has blocked this time",
        conflictingSlots,
      };
    }

    // Check if there's an available slot that covers this time
    const availableSlot = await ctx.db
      .query("bandAvailability")
      .withIndex("by_band", (q) => q.eq("bandId", args.bandId))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "available"),
          q.lte(q.field("startDateTime"), args.startDateTime),
          q.gte(q.field("endDateTime"), args.endDateTime)
        )
      )
      .first();

    // If no explicit availability set, band is assumed available
    // (unless they have blocked slots which we checked above)
    return {
      available: true,
      hasExplicitAvailability: !!availableSlot,
      availableSlot,
    };
  },
});

/**
 * Gets all availability slots for a band.
 * Returns available, booked, and blocked slots.
 *
 * @param bandId - The ID of the band
 * @param startDate - Optional filter: only slots starting after this date
 * @param endDate - Optional filter: only slots starting before this date
 * @returns Array of availability slots
 */
export const getByBand = query({
  args: {
    bandId: v.id("bands"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("bandAvailability")
      .withIndex("by_band", (q) => q.eq("bandId", args.bandId));

    let slots = await query.collect();

    // Apply date filters
    if (args.startDate !== undefined) {
      slots = slots.filter((slot) => slot.startDateTime >= args.startDate!);
    }
    if (args.endDate !== undefined) {
      slots = slots.filter((slot) => slot.startDateTime <= args.endDate!);
    }

    // Sort by start time
    slots.sort((a, b) => a.startDateTime - b.startDateTime);

    return slots;
  },
});

/**
 * Gets available slots for a band (for fans to view).
 * Only returns "available" status slots in the future.
 *
 * @param bandId - The ID of the band
 * @param limit - Maximum number of slots to return (default: 30)
 * @returns Array of available slots
 */
export const getAvailableSlots = query({
  args: {
    bandId: v.id("bands"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 30;
    const now = Date.now();

    const slots = await ctx.db
      .query("bandAvailability")
      .withIndex("by_band", (q) => q.eq("bandId", args.bandId))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "available"),
          q.gt(q.field("startDateTime"), now)
        )
      )
      .take(limit * 2); // Get more to allow for sorting

    // Sort by start time and limit
    return slots
      .sort((a, b) => a.startDateTime - b.startDateTime)
      .slice(0, limit);
  },
});

/**
 * Deletes an availability slot.
 * Can only delete available or blocked slots, not booked ones.
 *
 * @param slotId - The ID of the slot to delete
 * @throws Error if not authenticated, slot not found, slot is booked, or user doesn't own the band
 */
export const deleteSlot = mutation({
  args: {
    slotId: v.id("bandAvailability"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const slot = await ctx.db.get(args.slotId);
    if (!slot) {
      throw new Error("Slot not found");
    }

    if (slot.status === "booked") {
      throw new Error("Cannot delete a booked slot");
    }

    const band = await ctx.db.get(slot.bandId);
    if (!band || band.userId !== user._id) {
      throw new Error("You don't own this band");
    }

    await ctx.db.delete(args.slotId);
  },
});

/**
 * Internal mutation to mark a slot as booked.
 * Called when a booking is confirmed.
 *
 * @param slotId - The ID of the slot
 * @param bookingId - The ID of the booking
 * @internal
 */
export const markAsBooked = internalMutation({
  args: {
    slotId: v.id("bandAvailability"),
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.slotId, {
      status: "booked",
      bookingId: args.bookingId,
    });
  },
});

/**
 * Internal mutation to create a booked slot for a booking.
 * Used when booking a time without pre-existing availability.
 *
 * @param bandId - The ID of the band
 * @param listingId - The ID of the listing
 * @param bookingId - The ID of the booking
 * @param startDateTime - Start time
 * @param endDateTime - End time
 * @returns The created slot ID
 * @internal
 */
export const createBookedSlot = internalMutation({
  args: {
    bandId: v.id("bands"),
    listingId: v.id("bandListings"),
    bookingId: v.id("bookings"),
    startDateTime: v.number(),
    endDateTime: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("bandAvailability", {
      bandId: args.bandId,
      listingId: args.listingId,
      startDateTime: args.startDateTime,
      endDateTime: args.endDateTime,
      status: "booked",
      bookingId: args.bookingId,
      createdAt: Date.now(),
    });
  },
});

/**
 * Internal mutation to release a booked slot.
 * Called when a booking is cancelled.
 *
 * @param slotId - The ID of the slot to release
 * @param deleteSlot - Whether to delete the slot or mark it as available
 * @internal
 */
export const releaseSlot = internalMutation({
  args: {
    slotId: v.id("bandAvailability"),
    deleteSlot: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.deleteSlot) {
      await ctx.db.delete(args.slotId);
    } else {
      await ctx.db.patch(args.slotId, {
        status: "available",
        bookingId: undefined,
      });
    }
  },
});
