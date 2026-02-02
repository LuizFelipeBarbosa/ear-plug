/**
 * @fileoverview Convex queries and mutations for booking management.
 * Handles booking requests, acceptance, rejection, negotiation, and payment status.
 * @module convex/bookings
 */

import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

/** Validator for marketplace event types */
const marketplaceEventTypeValidator = v.union(
  v.literal("wedding"),
  v.literal("corporate"),
  v.literal("private_party"),
  v.literal("public_gig"),
  v.literal("festival"),
  v.literal("other")
);

/** Validator for booking status */
const bookingStatusValidator = v.union(
  v.literal("pending"),
  v.literal("negotiating"),
  v.literal("accepted"),
  v.literal("deposit_paid"),
  v.literal("confirmed"),
  v.literal("completed"),
  v.literal("cancelled"),
  v.literal("rejected"),
  v.literal("expired")
);

/**
 * Creates a new booking request from a fan to a band.
 *
 * @param listingId - The ID of the band listing
 * @param eventType - Type of event
 * @param eventName - Name/title of the event
 * @param eventDescription - Description of the event
 * @param eventDateTime - Date and time of the event
 * @param durationHours - Duration in hours
 * @param eventLocation - Location/address
 * @param eventCity - City name
 * @param guestCount - Expected number of guests
 * @param selectedAddOns - Array of selected add-on names
 * @param specialRequests - Special requirements
 * @returns The new booking's Convex document ID
 * @throws Error if not authenticated, listing not found, or user is a musician
 */
export const create = mutation({
  args: {
    listingId: v.id("bandListings"),
    eventType: marketplaceEventTypeValidator,
    eventName: v.string(),
    eventDescription: v.optional(v.string()),
    eventDateTime: v.number(),
    durationHours: v.number(),
    eventLocation: v.string(),
    eventCity: v.optional(v.string()),
    guestCount: v.optional(v.number()),
    selectedAddOns: v.optional(v.array(v.string())),
    specialRequests: v.optional(v.string()),
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

    if (user.role !== "fan") {
      throw new Error("Only fans can create bookings");
    }

    const listing = await ctx.db.get(args.listingId);
    if (!listing) {
      throw new Error("Listing not found");
    }

    if (listing.status !== "active") {
      throw new Error("Listing is not accepting bookings");
    }

    // Verify event type is supported
    if (!listing.eventTypes.includes(args.eventType)) {
      throw new Error("Band does not support this event type");
    }

    // Verify minimum hours
    if (args.durationHours < listing.minimumHours) {
      throw new Error(
        `Minimum booking duration is ${listing.minimumHours} hours`
      );
    }

    // Calculate price
    let totalPrice = listing.baseHourlyRate * args.durationHours;

    // Add selected add-ons
    if (args.selectedAddOns && listing.addOns) {
      for (const addOnName of args.selectedAddOns) {
        const addOn = listing.addOns.find((a) => a.name === addOnName);
        if (addOn) {
          totalPrice += addOn.priceInCents;
        }
      }
    }

    const depositAmount = Math.round(
      (totalPrice * listing.depositPercentage) / 100
    );

    const now = Date.now();

    // Create the booking
    const bookingId = await ctx.db.insert("bookings", {
      fanId: user._id,
      bandId: listing.bandId,
      listingId: args.listingId,
      eventType: args.eventType,
      eventName: args.eventName,
      eventDescription: args.eventDescription,
      eventDateTime: args.eventDateTime,
      durationHours: args.durationHours,
      eventLocation: args.eventLocation,
      eventCity: args.eventCity,
      guestCount: args.guestCount,
      selectedAddOns: args.selectedAddOns,
      specialRequests: args.specialRequests,
      totalPriceInCents: totalPrice,
      depositAmountInCents: depositAmount,
      paidAmountInCents: 0,
      status: "pending",
      requestedAt: now,
    });

    // Create the conversation for this booking
    await ctx.db.insert("bookingConversations", {
      bookingId,
      fanId: user._id,
      bandId: listing.bandId,
      lastMessageAt: now,
      lastMessagePreview: "Booking request submitted",
      fanUnreadCount: 0,
      bandUnreadCount: 1,
    });

    // Notify the band
    const band = await ctx.db.get(listing.bandId);
    if (band) {
      const bandOwner = await ctx.db.get(band.userId);
      if (bandOwner) {
        await ctx.runMutation(internal.notifications.createNotification, {
          userId: bandOwner._id,
          type: "booking_request",
          title: "New Booking Request",
          content: `${user.name} wants to book you for ${args.eventName}`,
          bandId: listing.bandId,
        });
      }
    }

    return bookingId;
  },
});

/**
 * Band accepts a booking request.
 * Can optionally provide a different quote.
 *
 * @param bookingId - The ID of the booking to accept
 * @param newPriceInCents - Optional new total price
 * @throws Error if not authenticated, booking not found, or user doesn't own the band
 */
export const accept = mutation({
  args: {
    bookingId: v.id("bookings"),
    newPriceInCents: v.optional(v.number()),
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

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    const band = await ctx.db.get(booking.bandId);
    if (!band || band.userId !== user._id) {
      throw new Error("You don't own this band");
    }

    if (!["pending", "negotiating"].includes(booking.status)) {
      throw new Error(`Cannot accept booking with status: ${booking.status}`);
    }

    const listing = await ctx.db.get(booking.listingId);
    if (!listing) {
      throw new Error("Listing not found");
    }

    const now = Date.now();
    const newPrice = args.newPriceInCents ?? booking.totalPriceInCents;
    const depositAmount = Math.round(
      (newPrice * listing.depositPercentage) / 100
    );

    await ctx.db.patch(args.bookingId, {
      status: "accepted",
      totalPriceInCents: newPrice,
      depositAmountInCents: depositAmount,
      respondedAt: now,
    });

    // Notify the fan
    await ctx.runMutation(internal.notifications.createNotification, {
      userId: booking.fanId,
      type: "booking_accepted",
      title: "Booking Accepted!",
      content: `${band.name} accepted your booking for ${booking.eventName}`,
      bandId: booking.bandId,
    });

    // Add system message to conversation
    const conversation = await ctx.db
      .query("bookingConversations")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
      .first();

    if (conversation) {
      await ctx.db.insert("bookingMessages", {
        conversationId: conversation._id,
        senderId: user._id,
        content:
          newPrice !== booking.totalPriceInCents
            ? `Booking accepted with updated quote: $${(newPrice / 100).toFixed(2)}`
            : "Booking accepted! Please proceed with the deposit payment.",
        messageType: "system",
        timestamp: now,
        read: false,
      });

      await ctx.db.patch(conversation._id, {
        lastMessageAt: now,
        lastMessagePreview: "Booking accepted",
        fanUnreadCount: conversation.fanUnreadCount + 1,
      });
    }
  },
});

/**
 * Band rejects a booking request.
 *
 * @param bookingId - The ID of the booking to reject
 * @param reason - Optional reason for rejection
 * @throws Error if not authenticated, booking not found, or user doesn't own the band
 */
export const reject = mutation({
  args: {
    bookingId: v.id("bookings"),
    reason: v.optional(v.string()),
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

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    const band = await ctx.db.get(booking.bandId);
    if (!band || band.userId !== user._id) {
      throw new Error("You don't own this band");
    }

    if (!["pending", "negotiating"].includes(booking.status)) {
      throw new Error(`Cannot reject booking with status: ${booking.status}`);
    }

    const now = Date.now();

    await ctx.db.patch(args.bookingId, {
      status: "rejected",
      statusReason: args.reason,
      respondedAt: now,
    });

    // Notify the fan
    await ctx.runMutation(internal.notifications.createNotification, {
      userId: booking.fanId,
      type: "booking_rejected",
      title: "Booking Declined",
      content: args.reason
        ? `${band.name} declined your booking: ${args.reason}`
        : `${band.name} declined your booking for ${booking.eventName}`,
      bandId: booking.bandId,
    });
  },
});

/**
 * Band updates the quote for a booking (counter-offer).
 *
 * @param bookingId - The ID of the booking
 * @param newPriceInCents - The new total price
 * @param message - Optional message explaining the change
 * @throws Error if not authenticated, booking not found, or user doesn't own the band
 */
export const updateQuote = mutation({
  args: {
    bookingId: v.id("bookings"),
    newPriceInCents: v.number(),
    message: v.optional(v.string()),
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

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    const band = await ctx.db.get(booking.bandId);
    if (!band || band.userId !== user._id) {
      throw new Error("You don't own this band");
    }

    if (!["pending", "negotiating"].includes(booking.status)) {
      throw new Error(`Cannot update quote for booking with status: ${booking.status}`);
    }

    const listing = await ctx.db.get(booking.listingId);
    if (!listing) {
      throw new Error("Listing not found");
    }

    const now = Date.now();
    const depositAmount = Math.round(
      (args.newPriceInCents * listing.depositPercentage) / 100
    );

    await ctx.db.patch(args.bookingId, {
      status: "negotiating",
      totalPriceInCents: args.newPriceInCents,
      depositAmountInCents: depositAmount,
    });

    // Add quote update message to conversation
    const conversation = await ctx.db
      .query("bookingConversations")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
      .first();

    if (conversation) {
      await ctx.db.insert("bookingMessages", {
        conversationId: conversation._id,
        senderId: user._id,
        content:
          args.message ?? `Updated quote: $${(args.newPriceInCents / 100).toFixed(2)}`,
        messageType: "quote_update",
        newPriceInCents: args.newPriceInCents,
        timestamp: now,
        read: false,
      });

      await ctx.db.patch(conversation._id, {
        lastMessageAt: now,
        lastMessagePreview: `New quote: $${(args.newPriceInCents / 100).toFixed(2)}`,
        fanUnreadCount: conversation.fanUnreadCount + 1,
      });
    }

    // Notify the fan
    await ctx.runMutation(internal.notifications.createNotification, {
      userId: booking.fanId,
      type: "booking_message",
      title: "Quote Updated",
      content: `${band.name} updated the quote to $${(args.newPriceInCents / 100).toFixed(2)}`,
      bandId: booking.bandId,
    });
  },
});

/**
 * Cancels a booking.
 * Either party can cancel, with different rules based on status.
 *
 * @param bookingId - The ID of the booking to cancel
 * @param reason - Reason for cancellation
 * @throws Error if not authenticated, booking not found, or user not involved
 */
export const cancel = mutation({
  args: {
    bookingId: v.id("bookings"),
    reason: v.optional(v.string()),
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

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    // Check if user is the fan or owns the band
    const band = await ctx.db.get(booking.bandId);
    const isFan = booking.fanId === user._id;
    const isBand = band && band.userId === user._id;

    if (!isFan && !isBand) {
      throw new Error("You're not involved in this booking");
    }

    if (["completed", "cancelled", "rejected", "expired"].includes(booking.status)) {
      throw new Error(`Cannot cancel booking with status: ${booking.status}`);
    }

    const now = Date.now();

    await ctx.db.patch(args.bookingId, {
      status: "cancelled",
      statusReason: args.reason,
      cancelledAt: now,
    });

    // Notify the other party
    if (isFan && band) {
      const bandOwner = await ctx.db.get(band.userId);
      if (bandOwner) {
        await ctx.runMutation(internal.notifications.createNotification, {
          userId: bandOwner._id,
          type: "booking_cancelled",
          title: "Booking Cancelled",
          content: `${user.name} cancelled the booking for ${booking.eventName}`,
          bandId: booking.bandId,
        });
      }
    } else if (isBand) {
      await ctx.runMutation(internal.notifications.createNotification, {
        userId: booking.fanId,
        type: "booking_cancelled",
        title: "Booking Cancelled",
        content: args.reason
          ? `${band?.name} cancelled your booking: ${args.reason}`
          : `${band?.name} cancelled your booking for ${booking.eventName}`,
        bandId: booking.bandId,
      });
    }

    // Release any booked availability slot
    const bookedSlot = await ctx.db
      .query("bandAvailability")
      .withIndex("by_band", (q) => q.eq("bandId", booking.bandId))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "booked"),
          q.eq(q.field("bookingId"), args.bookingId)
        )
      )
      .first();

    if (bookedSlot) {
      await ctx.runMutation(internal.bandAvailability.releaseSlot, {
        slotId: bookedSlot._id,
        deleteSlot: true,
      });
    }
  },
});

/**
 * Gets all bookings for the current fan user.
 *
 * @param status - Optional filter by status
 * @param limit - Maximum number of results (default: 50)
 * @returns Array of bookings with band data
 */
export const listByFan = query({
  args: {
    status: v.optional(bookingStatusValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    const limit = args.limit ?? 50;

    let bookings;
    if (args.status) {
      bookings = await ctx.db
        .query("bookings")
        .withIndex("by_fan", (q) => q.eq("fanId", user._id))
        .filter((q) => q.eq(q.field("status"), args.status))
        .order("desc")
        .take(limit);
    } else {
      bookings = await ctx.db
        .query("bookings")
        .withIndex("by_fan", (q) => q.eq("fanId", user._id))
        .order("desc")
        .take(limit);
    }

    // Fetch band and listing data
    return await Promise.all(
      bookings.map(async (booking) => {
        const band = await ctx.db.get(booking.bandId);
        const listing = await ctx.db.get(booking.listingId);
        return { ...booking, band, listing };
      })
    );
  },
});

/**
 * Gets all bookings for the current musician's band.
 *
 * @param status - Optional filter by status
 * @param limit - Maximum number of results (default: 50)
 * @returns Array of bookings with fan data
 */
export const listByBand = query({
  args: {
    status: v.optional(bookingStatusValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    // Get the user's band
    const band = await ctx.db
      .query("bands")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!band) {
      return [];
    }

    const limit = args.limit ?? 50;

    let bookings;
    if (args.status) {
      bookings = await ctx.db
        .query("bookings")
        .withIndex("by_band", (q) => q.eq("bandId", band._id))
        .filter((q) => q.eq(q.field("status"), args.status))
        .order("desc")
        .take(limit);
    } else {
      bookings = await ctx.db
        .query("bookings")
        .withIndex("by_band", (q) => q.eq("bandId", band._id))
        .order("desc")
        .take(limit);
    }

    // Fetch fan data
    return await Promise.all(
      bookings.map(async (booking) => {
        const fan = await ctx.db.get(booking.fanId);
        const listing = await ctx.db.get(booking.listingId);
        return { ...booking, fan, listing };
      })
    );
  },
});

/**
 * Gets a single booking by ID with full details.
 *
 * @param bookingId - The ID of the booking
 * @returns The booking with all related data
 */
export const getById = query({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return null;
    }

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      return null;
    }

    // Check if user is involved
    const band = await ctx.db.get(booking.bandId);
    const isFan = booking.fanId === user._id;
    const isBand = band && band.userId === user._id;

    if (!isFan && !isBand) {
      return null;
    }

    const fan = await ctx.db.get(booking.fanId);
    const listing = await ctx.db.get(booking.listingId);
    const conversation = await ctx.db
      .query("bookingConversations")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
      .first();

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
      .collect();

    return {
      ...booking,
      band,
      fan,
      listing,
      conversation,
      transactions,
    };
  },
});

/**
 * Internal mutation to update booking payment status.
 * Called by Stripe webhook handler.
 *
 * @param bookingId - The ID of the booking
 * @param status - New status
 * @param paidAmount - New paid amount in cents
 * @internal
 */
export const updatePaymentStatus = internalMutation({
  args: {
    bookingId: v.id("bookings"),
    status: bookingStatusValidator,
    paidAmount: v.number(),
    depositPaidAt: v.optional(v.number()),
    finalPaymentAt: v.optional(v.number()),
    confirmedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {
      status: args.status,
      paidAmountInCents: args.paidAmount,
    };

    if (args.depositPaidAt) {
      updates.depositPaidAt = args.depositPaidAt;
    }
    if (args.finalPaymentAt) {
      updates.finalPaymentAt = args.finalPaymentAt;
    }
    if (args.confirmedAt) {
      updates.confirmedAt = args.confirmedAt;
    }

    await ctx.db.patch(args.bookingId, updates);

    // If deposit paid, create/update availability slot
    const booking = await ctx.db.get(args.bookingId);
    if (booking && args.status === "deposit_paid") {
      // Create a booked slot for this booking
      const endDateTime =
        booking.eventDateTime + booking.durationHours * 60 * 60 * 1000;

      await ctx.runMutation(internal.bandAvailability.createBookedSlot, {
        bandId: booking.bandId,
        listingId: booking.listingId,
        bookingId: args.bookingId,
        startDateTime: booking.eventDateTime,
        endDateTime,
      });
    }
  },
});

/**
 * Marks a booking as completed.
 * Can only be done after the event date has passed.
 *
 * @param bookingId - The ID of the booking
 * @throws Error if not authenticated, booking not found, or event hasn't occurred
 */
export const complete = mutation({
  args: {
    bookingId: v.id("bookings"),
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

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    const band = await ctx.db.get(booking.bandId);
    if (!band || band.userId !== user._id) {
      throw new Error("You don't own this band");
    }

    if (booking.status !== "confirmed") {
      throw new Error("Booking must be confirmed to mark as completed");
    }

    const now = Date.now();
    const eventEnd =
      booking.eventDateTime + booking.durationHours * 60 * 60 * 1000;

    if (now < eventEnd) {
      throw new Error("Cannot mark booking as completed before event ends");
    }

    await ctx.db.patch(args.bookingId, {
      status: "completed",
      completedAt: now,
    });
  },
});

/**
 * Gets pending booking counts for the band dashboard.
 *
 * @returns Object with counts for different booking statuses
 */
export const getCounts = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { pending: 0, upcoming: 0, past: 0 };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return { pending: 0, upcoming: 0, past: 0 };
    }

    const band = await ctx.db
      .query("bands")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!band) {
      return { pending: 0, upcoming: 0, past: 0 };
    }

    const now = Date.now();

    const allBookings = await ctx.db
      .query("bookings")
      .withIndex("by_band", (q) => q.eq("bandId", band._id))
      .collect();

    const pending = allBookings.filter(
      (b) => b.status === "pending" || b.status === "negotiating"
    ).length;

    const upcoming = allBookings.filter(
      (b) =>
        ["accepted", "deposit_paid", "confirmed"].includes(b.status) &&
        b.eventDateTime > now
    ).length;

    const past = allBookings.filter(
      (b) =>
        b.status === "completed" ||
        (["confirmed"].includes(b.status) && b.eventDateTime < now)
    ).length;

    return { pending, upcoming, past };
  },
});
