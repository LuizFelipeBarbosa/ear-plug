import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";

const notificationTypeValidator = v.union(
  v.literal("event_reminder"),
  v.literal("lineup_change"),
  v.literal("new_event_followed_artist"),
  v.literal("new_event_nearby"),
  v.literal("application_update"),
  v.literal("message")
);

// Get notifications for current user
export const list = query({
  args: {
    limit: v.optional(v.number()),
    unreadOnly: v.optional(v.boolean()),
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

    const limit = args.limit || 50;

    let notifications;
    if (args.unreadOnly) {
      notifications = await ctx.db
        .query("notifications")
        .withIndex("by_user_read", (q) =>
          q.eq("userId", user._id).eq("read", false)
        )
        .order("desc")
        .take(limit);
    } else {
      notifications = await ctx.db
        .query("notifications")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .order("desc")
        .take(limit);
    }

    // Fetch related event/band/venue data
    const notificationsWithDetails = await Promise.all(
      notifications.map(async (notif) => {
        const event = notif.eventId ? await ctx.db.get(notif.eventId) : null;
        const band = notif.bandId ? await ctx.db.get(notif.bandId) : null;
        const venue = notif.venueId ? await ctx.db.get(notif.venueId) : null;
        return { ...notif, event, band, venue };
      })
    );

    return notificationsWithDetails;
  },
});

// Get unread notification count
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return 0;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return 0;
    }

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", user._id).eq("read", false)
      )
      .collect();

    return unread.length;
  },
});

// Mark notification as read
export const markAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    await ctx.db.patch(args.notificationId, { read: true });
  },
});

// Mark all notifications as read
export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
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

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", user._id).eq("read", false)
      )
      .collect();

    await Promise.all(
      unread.map((notif) => ctx.db.patch(notif._id, { read: true }))
    );

    return { markedCount: unread.length };
  },
});

// Delete a notification
export const remove = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      return;
    }

    await ctx.db.delete(args.notificationId);
  },
});

// Create a notification (internal use)
export const createNotification = internalMutation({
  args: {
    userId: v.id("users"),
    type: notificationTypeValidator,
    title: v.string(),
    content: v.string(),
    eventId: v.optional(v.id("events")),
    bandId: v.optional(v.id("bands")),
    venueId: v.optional(v.id("venues")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      content: args.content,
      timestamp: Date.now(),
      read: false,
      eventId: args.eventId,
      bandId: args.bandId,
      venueId: args.venueId,
    });
  },
});

// Create event reminder notification
export const createEventReminder = mutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const venue = await ctx.db.get(event.venueId);
    const band = await ctx.db.get(event.bandId);

    // Get all RSVPs for this event
    const rsvps = await ctx.db
      .query("rsvps")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    // Create notification for each RSVP'd user
    await Promise.all(
      rsvps.map((rsvp) =>
        ctx.db.insert("notifications", {
          userId: rsvp.userId,
          type: "event_reminder",
          title: "Event Reminder",
          content: `${band?.name || "Your event"} at ${venue?.name || "the venue"} is coming up!`,
          timestamp: Date.now(),
          read: false,
          eventId: args.eventId,
          bandId: event.bandId,
          venueId: event.venueId,
        })
      )
    );

    return { notifiedCount: rsvps.length };
  },
});

// Notify fans who have saved a venue when a new event is created there
export const createNearbyEventNotifications = internalMutation({
  args: {
    eventId: v.id("events"),
    venueId: v.id("venues"),
    bandId: v.id("bands"),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    const venue = await ctx.db.get(args.venueId);
    const band = await ctx.db.get(args.bandId);

    if (!event || !venue || !band) {
      return { notifiedCount: 0 };
    }

    // Get all users who have saved this venue
    const savedVenues = await ctx.db
      .query("savedVenues")
      .withIndex("by_venue", (q) => q.eq("venueId", args.venueId))
      .collect();

    // Also check if any users have saved this band
    const savedBands = await ctx.db
      .query("savedArtists")
      .withIndex("by_band", (q) => q.eq("bandId", args.bandId))
      .collect();

    // Combine user IDs (remove duplicates)
    const userIds = new Set([
      ...savedVenues.map((sv) => sv.userId),
      ...savedBands.map((sb) => sb.userId),
    ]);

    // Create notifications for each user
    const notifications = await Promise.all(
      Array.from(userIds).map((userId) =>
        ctx.db.insert("notifications", {
          userId,
          type: "new_event_nearby",
          title: "New Event at a Saved Venue",
          content: `${band.name} is playing at ${venue.name}!`,
          timestamp: Date.now(),
          read: false,
          eventId: args.eventId,
          bandId: args.bandId,
          venueId: args.venueId,
        })
      )
    );

    return { notifiedCount: notifications.length };
  },
});
