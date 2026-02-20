/**
 * @fileoverview Convex queries and mutations for messaging between bands and venues.
 * Handles conversations, message sending, and per-user read status tracking.
 * @module convex/messages
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  requireAuthenticatedUser,
  requireBandMember,
  requireBandRole,
} from "./utils/permissions";

async function countUnreadMessages(
  ctx: QueryCtx | MutationCtx,
  conversationId: Id<"conversations">,
  userId: Id<"users">,
  lastReadAt: number
) {
  const unreadMessages = await ctx.db
    .query("messages")
    .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
    .filter((q) =>
      q.and(
        q.neq(q.field("senderId"), userId),
        q.gt(q.field("timestamp"), lastReadAt)
      )
    )
    .collect();

  return unreadMessages.length;
}

/**
 * Gets all conversations for a band.
 * Requires band membership.
 */
export const getBandConversations = query({
  args: {
    bandId: v.id("bands"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireBandMember(ctx, args.bandId);

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_band", (q) => q.eq("bandId", args.bandId))
      .order("desc")
      .collect();

    return await Promise.all(
      conversations.map(async (conversation) => {
        const venue = await ctx.db.get(conversation.venueId);
        const readCursor = await ctx.db
          .query("conversationReads")
          .withIndex("by_conversation_user", (q) =>
            q.eq("conversationId", conversation._id).eq("userId", user._id)
          )
          .unique();

        const unreadCount = await countUnreadMessages(
          ctx,
          conversation._id,
          user._id,
          readCursor?.lastReadAt ?? 0
        );

        return {
          ...conversation,
          venue,
          unreadCount,
        };
      })
    );
  },
});

/**
 * Gets all messages in a conversation.
 * Requires membership in the conversation's band.
 */
export const getConversationMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      return [];
    }

    await requireBandMember(ctx, conversation.bandId);

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .collect();

    return await Promise.all(
      messages.map(async (message) => {
        const sender = await ctx.db.get(message.senderId);
        return {
          ...message,
          sender,
        };
      })
    );
  },
});

/**
 * Sends a new message in a conversation.
 * Requires membership in the conversation's band.
 */
export const send = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    await requireBandMember(ctx, conversation.bandId);

    const now = Date.now();
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: user._id,
      content: args.content,
      timestamp: now,
      read: false, // legacy field retained for compatibility
    });

    await ctx.db.patch(conversation._id, {
      lastMessageAt: now,
      lastMessagePreview:
        args.content.length > 50
          ? `${args.content.substring(0, 47)}...`
          : args.content,
    });

    return messageId;
  },
});

/**
 * Marks a conversation as read for the current user.
 * Uses per-user read cursor (`conversationReads`).
 */
export const markAsRead = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    await requireBandMember(ctx, conversation.bandId);

    const existingCursor = await ctx.db
      .query("conversationReads")
      .withIndex("by_conversation_user", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", user._id)
      )
      .unique();

    const unreadMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .filter((q) =>
        q.and(
          q.neq(q.field("senderId"), user._id),
          q.gt(q.field("timestamp"), existingCursor?.lastReadAt ?? 0)
        )
      )
      .collect();

    const now = Date.now();

    if (existingCursor) {
      await ctx.db.patch(existingCursor._id, {
        lastReadAt: now,
      });
    } else {
      await ctx.db.insert("conversationReads", {
        conversationId: args.conversationId,
        userId: user._id,
        lastReadAt: now,
      });
    }

    return { markedCount: unreadMessages.length };
  },
});

/**
 * Starts a new conversation between a band and venue, or returns existing one.
 * Only owner/admin may start conversations.
 */
export const startConversation = mutation({
  args: {
    bandId: v.id("bands"),
    venueId: v.id("venues"),
    initialMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireBandRole(ctx, args.bandId, ["owner", "admin"]);

    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_band_venue", (q) =>
        q.eq("bandId", args.bandId).eq("venueId", args.venueId)
      )
      .unique();

    if (existing) {
      if (!args.initialMessage) {
        return existing._id;
      }

      const now = Date.now();
      await ctx.db.insert("messages", {
        conversationId: existing._id,
        senderId: user._id,
        content: args.initialMessage,
        timestamp: now,
        read: false,
      });

      await ctx.db.patch(existing._id, {
        lastMessageAt: now,
        lastMessagePreview:
          args.initialMessage.length > 50
            ? `${args.initialMessage.substring(0, 47)}...`
            : args.initialMessage,
      });

      return existing._id;
    }

    const now = Date.now();
    const conversationId = await ctx.db.insert("conversations", {
      bandId: args.bandId,
      venueId: args.venueId,
      lastMessageAt: now,
      lastMessagePreview: args.initialMessage
        ? args.initialMessage.length > 50
          ? `${args.initialMessage.substring(0, 47)}...`
          : args.initialMessage
        : undefined,
    });

    if (args.initialMessage) {
      await ctx.db.insert("messages", {
        conversationId,
        senderId: user._id,
        content: args.initialMessage,
        timestamp: now,
        read: false,
      });
    }

    // Sender has effectively read up to current message timestamp.
    await ctx.db.insert("conversationReads", {
      conversationId,
      userId: user._id,
      lastReadAt: now,
    });

    return conversationId;
  },
});

/**
 * Gets total unread message count for a band.
 * Requires band membership.
 */
export const getUnreadCount = query({
  args: {
    bandId: v.id("bands"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireBandMember(ctx, args.bandId);

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_band", (q) => q.eq("bandId", args.bandId))
      .collect();

    let totalUnread = 0;
    for (const conversation of conversations) {
      const cursor = await ctx.db
        .query("conversationReads")
        .withIndex("by_conversation_user", (q) =>
          q.eq("conversationId", conversation._id).eq("userId", user._id)
        )
        .unique();

      totalUnread += await countUnreadMessages(
        ctx,
        conversation._id,
        user._id,
        cursor?.lastReadAt ?? 0
      );
    }

    return totalUnread;
  },
});
