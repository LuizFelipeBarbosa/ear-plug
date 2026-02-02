/**
 * @fileoverview Convex queries and mutations for booking conversation messaging.
 * Handles fan-band messaging within the context of a booking.
 * @module convex/bookingMessages
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";

/** Validator for booking message types */
const bookingMessageTypeValidator = v.union(
  v.literal("text"),
  v.literal("quote_update"),
  v.literal("system")
);

/**
 * Gets or creates a conversation for a booking.
 *
 * @param bookingId - The ID of the booking
 * @returns The conversation document with messages
 */
export const getConversation = query({
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

    // Check if user is involved in this booking
    const band = await ctx.db.get(booking.bandId);
    const isFan = booking.fanId === user._id;
    const isBand = band && band.userId === user._id;

    if (!isFan && !isBand) {
      return null;
    }

    const conversation = await ctx.db
      .query("bookingConversations")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
      .first();

    if (!conversation) {
      return null;
    }

    // Get messages
    const messages = await ctx.db
      .query("bookingMessages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversation._id)
      )
      .order("asc")
      .collect();

    // Get sender info for each message
    const messagesWithSenders = await Promise.all(
      messages.map(async (message) => {
        const sender = await ctx.db.get(message.senderId);
        return {
          ...message,
          sender: sender
            ? { name: sender.name, avatar: sender.avatar }
            : { name: "Unknown", avatar: undefined },
          isCurrentUser: message.senderId === user._id,
        };
      })
    );

    const fan = await ctx.db.get(booking.fanId);

    return {
      ...conversation,
      messages: messagesWithSenders,
      band,
      fan,
      booking,
      currentUserRole: isFan ? "fan" : "band",
    };
  },
});

/**
 * Sends a message in a booking conversation.
 *
 * @param conversationId - The ID of the conversation
 * @param content - Message content
 * @returns The new message's document ID
 * @throws Error if not authenticated, conversation not found, or user not involved
 */
export const send = mutation({
  args: {
    conversationId: v.id("bookingConversations"),
    content: v.string(),
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

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // Check if user is involved
    const band = await ctx.db.get(conversation.bandId);
    const isFan = conversation.fanId === user._id;
    const isBand = band && band.userId === user._id;

    if (!isFan && !isBand) {
      throw new Error("You're not part of this conversation");
    }

    const now = Date.now();

    // Create the message
    const messageId = await ctx.db.insert("bookingMessages", {
      conversationId: args.conversationId,
      senderId: user._id,
      content: args.content,
      messageType: "text",
      timestamp: now,
      read: false,
    });

    // Update conversation metadata
    const preview =
      args.content.length > 50
        ? args.content.substring(0, 47) + "..."
        : args.content;

    await ctx.db.patch(args.conversationId, {
      lastMessageAt: now,
      lastMessagePreview: preview,
      // Increment unread count for the other party
      ...(isFan
        ? { bandUnreadCount: conversation.bandUnreadCount + 1 }
        : { fanUnreadCount: conversation.fanUnreadCount + 1 }),
    });

    // Notify the other party
    const booking = await ctx.db.get(conversation.bookingId);
    if (booking) {
      if (isFan && band) {
        const bandOwner = await ctx.db.get(band.userId);
        if (bandOwner) {
          await ctx.runMutation(internal.notifications.createNotification, {
            userId: bandOwner._id,
            type: "booking_message",
            title: "New Message",
            content: `${user.name}: ${preview}`,
            bandId: conversation.bandId,
          });
        }
      } else if (isBand) {
        await ctx.runMutation(internal.notifications.createNotification, {
          userId: conversation.fanId,
          type: "booking_message",
          title: "New Message",
          content: `${band?.name}: ${preview}`,
          bandId: conversation.bandId,
        });
      }
    }

    return messageId;
  },
});

/**
 * Marks messages as read in a conversation.
 *
 * @param conversationId - The ID of the conversation
 * @throws Error if not authenticated, conversation not found, or user not involved
 */
export const markAsRead = mutation({
  args: {
    conversationId: v.id("bookingConversations"),
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

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // Check if user is involved
    const band = await ctx.db.get(conversation.bandId);
    const isFan = conversation.fanId === user._id;
    const isBand = band && band.userId === user._id;

    if (!isFan && !isBand) {
      throw new Error("You're not part of this conversation");
    }

    // Mark all unread messages as read
    const unreadMessages = await ctx.db
      .query("bookingMessages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .filter((q) =>
        q.and(q.eq(q.field("read"), false), q.neq(q.field("senderId"), user._id))
      )
      .collect();

    await Promise.all(
      unreadMessages.map((msg) => ctx.db.patch(msg._id, { read: true }))
    );

    // Reset unread count for this user
    await ctx.db.patch(args.conversationId, {
      ...(isFan ? { fanUnreadCount: 0 } : { bandUnreadCount: 0 }),
    });
  },
});

/**
 * Gets all booking conversations for a band.
 *
 * @param limit - Maximum number of results (default: 50)
 * @returns Array of conversations with last message preview and fan info
 */
export const getBandConversations = query({
  args: {
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

    // Get user's band
    const band = await ctx.db
      .query("bands")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!band) {
      return [];
    }

    const limit = args.limit ?? 50;

    const conversations = await ctx.db
      .query("bookingConversations")
      .withIndex("by_band", (q) => q.eq("bandId", band._id))
      .order("desc")
      .take(limit);

    // Fetch fan and booking info for each conversation
    return await Promise.all(
      conversations.map(async (conv) => {
        const fan = await ctx.db.get(conv.fanId);
        const booking = await ctx.db.get(conv.bookingId);
        return {
          ...conv,
          fan,
          booking,
          unreadCount: conv.bandUnreadCount,
        };
      })
    );
  },
});

/**
 * Gets all booking conversations for a fan.
 *
 * @param limit - Maximum number of results (default: 50)
 * @returns Array of conversations with last message preview and band info
 */
export const getFanConversations = query({
  args: {
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

    const conversations = await ctx.db
      .query("bookingConversations")
      .withIndex("by_fan", (q) => q.eq("fanId", user._id))
      .order("desc")
      .take(limit);

    // Fetch band and booking info for each conversation
    return await Promise.all(
      conversations.map(async (conv) => {
        const band = await ctx.db.get(conv.bandId);
        const booking = await ctx.db.get(conv.bookingId);
        return {
          ...conv,
          band,
          booking,
          unreadCount: conv.fanUnreadCount,
        };
      })
    );
  },
});

/**
 * Gets total unread count for booking messages.
 *
 * @returns Number of unread messages across all booking conversations
 */
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

    // Check if user is a fan
    if (user.role === "fan") {
      const conversations = await ctx.db
        .query("bookingConversations")
        .withIndex("by_fan", (q) => q.eq("fanId", user._id))
        .collect();

      return conversations.reduce((sum, conv) => sum + conv.fanUnreadCount, 0);
    }

    // Check if user is a musician with a band
    const band = await ctx.db
      .query("bands")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!band) {
      return 0;
    }

    const conversations = await ctx.db
      .query("bookingConversations")
      .withIndex("by_band", (q) => q.eq("bandId", band._id))
      .collect();

    return conversations.reduce((sum, conv) => sum + conv.bandUnreadCount, 0);
  },
});
