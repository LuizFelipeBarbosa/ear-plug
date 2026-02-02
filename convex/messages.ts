/**
 * @fileoverview Convex queries and mutations for messaging between bands and venues.
 * Handles conversations, message sending, and read status tracking.
 * @module convex/messages
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Gets all conversations for the current user's band.
 * Includes venue data and unread message count for each conversation.
 * Only available for musician users with a band.
 * Returns empty array if not authenticated, not a musician, or no band exists.
 *
 * @returns Array of conversation documents with venue and unreadCount properties
 *
 * @example
 * const conversations = useQuery(api.messages.getBandConversations);
 * conversations.forEach(conv => {
 *   console.log(`${conv.venue?.name}: ${conv.unreadCount} unread`);
 * });
 */
export const getBandConversations = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || user.role !== "musician") {
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

    // Get all conversations for this band
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_band", (q) => q.eq("bandId", band._id))
      .order("desc")
      .collect();

    // Fetch venue data and unread count
    const conversationsWithDetails = await Promise.all(
      conversations.map(async (conv) => {
        const venue = await ctx.db.get(conv.venueId);

        // Count unread messages
        const unreadMessages = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
          .filter((q) =>
            q.and(
              q.eq(q.field("read"), false),
              q.neq(q.field("senderId"), user._id)
            )
          )
          .collect();

        return {
          ...conv,
          venue,
          unreadCount: unreadMessages.length,
        };
      })
    );

    return conversationsWithDetails;
  },
});

/**
 * Gets all messages in a conversation, ordered chronologically.
 * Includes sender user data for each message.
 * Requires authentication.
 *
 * @param conversationId - The Convex ID of the conversation
 * @returns Array of message documents with sender property, oldest first
 *
 * @example
 * const messages = useQuery(api.messages.getConversationMessages, {
 *   conversationId: "k9x..."
 * });
 */
export const getConversationMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .collect();

    // Fetch sender data
    const messagesWithSender = await Promise.all(
      messages.map(async (msg) => {
        const sender = await ctx.db.get(msg.senderId);
        return { ...msg, sender };
      })
    );

    return messagesWithSender;
  },
});

/**
 * Sends a new message in a conversation.
 * Updates the conversation's last message metadata.
 * Requires authentication.
 *
 * @param conversationId - The Convex ID of the conversation
 * @param content - The message text content (1-5000 characters)
 * @returns The new message's Convex document ID
 * @throws Error if not authenticated or user not found
 *
 * @example
 * const send = useMutation(api.messages.send);
 * await send({
 *   conversationId: "k9x...",
 *   content: "Looking forward to the show!"
 * });
 */
export const send = mutation({
  args: {
    conversationId: v.id("conversations"),
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

    const now = Date.now();

    // Create the message
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: user._id,
      content: args.content,
      timestamp: now,
      read: false,
    });

    // Update conversation with last message info
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: now,
      lastMessagePreview:
        args.content.length > 50
          ? args.content.substring(0, 47) + "..."
          : args.content,
    });

    return messageId;
  },
});

/**
 * Marks all messages in a conversation as read for the current user.
 * Only marks messages from other users as read (not the user's own messages).
 * Requires authentication.
 *
 * @param conversationId - The Convex ID of the conversation
 * @returns Object with markedCount indicating how many messages were marked
 * @throws Error if not authenticated or user not found
 *
 * @example
 * const markAsRead = useMutation(api.messages.markAsRead);
 * const { markedCount } = await markAsRead({ conversationId: "k9x..." });
 */
export const markAsRead = mutation({
  args: { conversationId: v.id("conversations") },
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

    // Get all unread messages not from this user
    const unreadMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("read"), false),
          q.neq(q.field("senderId"), user._id)
        )
      )
      .collect();

    // Mark all as read
    await Promise.all(
      unreadMessages.map((msg) => ctx.db.patch(msg._id, { read: true }))
    );

    return { markedCount: unreadMessages.length };
  },
});

/**
 * Starts a new conversation between a band and venue, or returns existing conversation.
 * Optionally sends an initial message when creating the conversation.
 * Requires authentication.
 *
 * @param bandId - The Convex ID of the band
 * @param venueId - The Convex ID of the venue
 * @param initialMessage - Optional message to send when creating conversation
 * @returns The conversation's Convex document ID (new or existing)
 * @throws Error if not authenticated or user not found
 *
 * @example
 * const startConversation = useMutation(api.messages.startConversation);
 * const conversationId = await startConversation({
 *   bandId: "abc...",
 *   venueId: "xyz...",
 *   initialMessage: "Hi, we'd love to book a show!"
 * });
 */
export const startConversation = mutation({
  args: {
    bandId: v.id("bands"),
    venueId: v.id("venues"),
    initialMessage: v.optional(v.string()),
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

    // Check if conversation already exists
    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_band_venue", (q) =>
        q.eq("bandId", args.bandId).eq("venueId", args.venueId)
      )
      .unique();

    if (existing) {
      // Send initial message if provided
      if (args.initialMessage) {
        await ctx.db.insert("messages", {
          conversationId: existing._id,
          senderId: user._id,
          content: args.initialMessage,
          timestamp: Date.now(),
          read: false,
        });

        await ctx.db.patch(existing._id, {
          lastMessageAt: Date.now(),
          lastMessagePreview:
            args.initialMessage.length > 50
              ? args.initialMessage.substring(0, 47) + "..."
              : args.initialMessage,
        });
      }

      return existing._id;
    }

    // Create new conversation
    const now = Date.now();
    const conversationId = await ctx.db.insert("conversations", {
      bandId: args.bandId,
      venueId: args.venueId,
      lastMessageAt: now,
      lastMessagePreview: args.initialMessage
        ? args.initialMessage.length > 50
          ? args.initialMessage.substring(0, 47) + "..."
          : args.initialMessage
        : undefined,
    });

    // Send initial message if provided
    if (args.initialMessage) {
      await ctx.db.insert("messages", {
        conversationId,
        senderId: user._id,
        content: args.initialMessage,
        timestamp: now,
        read: false,
      });
    }

    return conversationId;
  },
});

/**
 * Gets the total count of unread messages across all conversations for the current user's band.
 * Used for displaying notification badges.
 * Returns 0 if not authenticated, not a musician, or no band exists.
 *
 * @returns Total number of unread messages
 *
 * @example
 * const unreadCount = useQuery(api.messages.getUnreadCount);
 * if (unreadCount > 0) {
 *   // Show badge with unreadCount
 * }
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

    if (!user || user.role !== "musician") {
      return 0;
    }

    const band = await ctx.db
      .query("bands")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!band) {
      return 0;
    }

    // Get all conversations
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_band", (q) => q.eq("bandId", band._id))
      .collect();

    // Count unread messages
    let totalUnread = 0;
    for (const conv of conversations) {
      const unread = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
        .filter((q) =>
          q.and(
            q.eq(q.field("read"), false),
            q.neq(q.field("senderId"), user._id)
          )
        )
        .collect();
      totalUnread += unread.length;
    }

    return totalUnread;
  },
});
