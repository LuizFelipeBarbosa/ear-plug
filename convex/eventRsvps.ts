/**
 * @fileoverview Convex queries and mutations for event RSVP, like, guest list,
 * and poll interactions.
 * @module convex/eventRsvps
 */

import { ConvexError, v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import {
  isPublicEvent,
  buildViewerContext,
  applyAddressMask,
  resolveEventBandAccess,
  getAttendanceStatus,
  decrementShowsAttended,
  incrementShowsAttended,
  buildPollPromptPayload,
  canAnswerEventPoll,
  createEventHydrationCache,
  hydratePublicEvent,
  guestFilterTypeValidator,
  GUEST_LIST_PREVIEW_LIMIT,
  GUEST_LIST_CAP,
  RSVP_CANCEL_REVOKE_REASON,
  GUEST_REMOVED_REVOKE_REASON,
} from "./events";
import type { ViewerContext, GuestRsvpType, PublicEvent } from "./events";
import {
  createTicketForRsvp,
  revokeActiveTicketForRsvp,
  markTicketUsedForRsvp,
} from "./eventTickets";
import {
  getAuthenticatedUserOrNull,
  requireAuthenticatedUser,
} from "./utils/permissions";
import { isEventPast } from "../packages/shared/src/eventTiming";

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function sortEventsByDate<T extends { dateTime: number }>(
  events: T[],
  direction: "asc" | "desc"
) {
  return events.sort((a, b) =>
    direction === "asc" ? a.dateTime - b.dateTime : b.dateTime - a.dateTime
  );
}

async function listUserRsvpEventsWithDetails(
  ctx: QueryCtx,
  userId: Id<"users">,
  options: { pastOnly: boolean }
) {
  const now = Date.now();
  const rsvps = await ctx.db
    .query("rsvps")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const cache = createEventHydrationCache();

  const eventsWithDetails = await Promise.all(
    rsvps.map(async (rsvp) => {
      const event = await ctx.db.get(rsvp.eventId);
      if (!event || !isPublicEvent(event)) {
        return null;
      }

      if (options.pastOnly ? !isEventPast(event.dateTime, now) : isEventPast(event.dateTime, now)) {
        return null;
      }

      const hydrated = await hydratePublicEvent(ctx, event, cache);
      if (options.pastOnly) {
        return {
          ...hydrated,
          rsvpedAt: rsvp.createdAt,
          attendanceStatus: getAttendanceStatus(rsvp),
          attendedAt: rsvp.attendedAt,
        };
      }

      return {
        ...hydrated,
        rsvpedAt: rsvp.createdAt,
      };
    })
  );

  const filtered = eventsWithDetails.filter(
    (event): event is NonNullable<typeof event> => event !== null
  );
  return sortEventsByDate(filtered, options.pastOnly ? "desc" : "asc");
}

async function listUserLikedEventsWithDetails(
  ctx: QueryCtx,
  userId: Id<"users">,
  viewerContext: ViewerContext
) {
  const likes = await ctx.db
    .query("likes")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const cache = createEventHydrationCache();

  const eventsWithDetails = await Promise.all(
    likes.map(async (like) => {
      if (viewerContext.rsvpEventIds.has(like.eventId)) {
        return null;
      }

      const event = await ctx.db.get(like.eventId);
      if (!event || !isPublicEvent(event)) {
        return null;
      }

      const hydrated = await hydratePublicEvent(ctx, event, cache);
      return applyAddressMask(
        {
          ...hydrated,
          likedAt: like.createdAt,
        },
        viewerContext
      );
    })
  );

  const filtered = eventsWithDetails.filter(
    (event): event is NonNullable<typeof event> => event !== null
  );
  return sortEventsByDate(filtered, "asc");
}

// ---------------------------------------------------------------------------
// Exported Convex functions
// ---------------------------------------------------------------------------

/**
 * Toggles RSVP status for the current user on an event.
 * If already RSVP'd, removes the RSVP. Otherwise, adds one.
 * Updates the event's rsvpCount accordingly.
 *
 * @param args.eventId - The Convex ID of the event to RSVP to
 * @returns Object with action: "added" or "removed"
 * @throws Error if not authenticated or user not found
 *
 * @example
 * const result = await ctx.runMutation(api.events.rsvp, {
 *   eventId: event._id
 * });
 * if (result.action === "added") {
 *   toast.success("RSVP confirmed!");
 * }
 */
export const rsvp = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);

    const event = await ctx.db.get(args.eventId);
    if (!event || !isPublicEvent(event)) {
      throw new Error("This gig is not available for RSVP.");
    }

    // Check if already RSVP'd
    const existingRsvp = await ctx.db
      .query("rsvps")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", user._id).eq("eventId", args.eventId)
      )
      .unique();

    if (existingRsvp) {
      if (getAttendanceStatus(existingRsvp) === "attended") {
        await decrementShowsAttended(ctx, user._id);
      }

      await revokeActiveTicketForRsvp(ctx, existingRsvp._id, RSVP_CANCEL_REVOKE_REASON);

      // Remove RSVP
      await ctx.db.delete(existingRsvp._id);

      // Decrement RSVP count
      await ctx.db.patch(args.eventId, {
        rsvpCount: Math.max(0, event.rsvpCount - 1),
      });

      return { action: "removed", pollPrompt: null };
    }

    // Check capacity before adding RSVP
    if (event.capacity && event.rsvpCount >= event.capacity) {
      throw new Error("This event is at capacity.");
    }

    // Add RSVP
    const rsvpId = await ctx.db.insert("rsvps", {
      userId: user._id,
      eventId: args.eventId,
      createdAt: Date.now(),
      attendanceStatus: "on_list",
    });

    await createTicketForRsvp(ctx, {
      _id: rsvpId,
      eventId: args.eventId,
      userId: user._id,
    });

    // Increment RSVP count
    await ctx.db.patch(args.eventId, {
      rsvpCount: event.rsvpCount + 1,
    });

    return {
      action: "added",
      pollPrompt: buildPollPromptPayload(event),
    };
  },
});

export const submitEventPollResponse = mutation({
  args: {
    eventId: v.id("events"),
    optionId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const event = await ctx.db.get(args.eventId);

    if (!event || !isPublicEvent(event)) {
      throw new ConvexError({
        code: "event_not_found",
        message: "This gig is not available.",
      });
    }

    if (!canAnswerEventPoll(event)) {
      throw new ConvexError({
        code: "poll_closed",
        message: "This RSVP poll is no longer accepting answers.",
      });
    }

    const optionId = args.optionId.trim();
    if (optionId.length === 0) {
      throw new ConvexError({
        code: "invalid_poll_option",
        message: "Choose an answer before submitting.",
      });
    }

    const selectedOption = event.poll?.options.find((option) => option.id === optionId);
    if (!selectedOption) {
      throw new ConvexError({
        code: "invalid_poll_option",
        message: "That poll answer is no longer available.",
      });
    }

    const rsvp = await ctx.db
      .query("rsvps")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", user._id).eq("eventId", args.eventId)
      )
      .unique();

    if (!rsvp) {
      throw new ConvexError({
        code: "missing_rsvp",
        message: "RSVP to this gig before answering the poll.",
      });
    }

    const pollAnsweredAt = Date.now();
    await ctx.db.patch(rsvp._id, {
      pollAnswerOptionId: selectedOption.id,
      pollAnsweredAt,
    });

    return {
      optionId: selectedOption.id,
      label: selectedOption.label,
      pollAnsweredAt,
    };
  },
});

/**
 * Toggles like status for the current user on an event.
 * If already liked, removes the like. Otherwise, adds one.
 *
 * @param args.eventId - The Convex ID of the event to like/unlike
 * @returns Object with action: "liked" or "unliked"
 * @throws Error if not authenticated or user not found
 *
 * @example
 * const result = await ctx.runMutation(api.events.toggleLike, {
 *   eventId: event._id
 * });
 * // Update UI based on result.action
 */
export const toggleLike = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);

    const event = await ctx.db.get(args.eventId);
    if (!event || !isPublicEvent(event)) {
      throw new Error("This gig is not available to save.");
    }

    // Check if already liked
    const existingLike = await ctx.db
      .query("likes")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", user._id).eq("eventId", args.eventId)
      )
      .unique();

    if (existingLike) {
      await ctx.db.delete(existingLike._id);
      return { action: "unliked" };
    }

    await ctx.db.insert("likes", {
      userId: user._id,
      eventId: args.eventId,
      createdAt: Date.now(),
    });

    return { action: "liked" };
  },
});

/**
 * Gets the current user's upcoming RSVP'd events.
 * Excludes past events. Returns events sorted by date ascending.
 *
 * @returns Array of upcoming event documents with band, venue, and rsvpedAt timestamp
 *
 * @example
 * const myUpcomingEvents = await ctx.runQuery(api.events.getUserRsvps);
 * // Display in user's "My Events" section
 */
export const getUserRsvps = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUserOrNull(ctx);
    if (!user) {
      return [];
    }
    return await listUserRsvpEventsWithDetails(ctx, user._id, { pastOnly: false });
  },
});

/**
 * Gets the current user's past RSVP'd events.
 * Only includes events that have already occurred.
 * Returns events sorted by date descending (most recent first).
 *
 * @returns Array of past event documents with band, venue, rsvpedAt, and attendance status
 *
 * @example
 * const pastEvents = await ctx.runQuery(api.events.getUserPastRsvps);
 * // Display in user's "Past Events" or "History" section
 */
export const getUserPastRsvps = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUserOrNull(ctx);
    if (!user) {
      return [];
    }
    return await listUserRsvpEventsWithDetails(ctx, user._id, { pastOnly: true });
  },
});

/**
 * Gets the current user's liked events.
 * Excludes events that the user has also RSVP'd to.
 * Returns events sorted by date ascending.
 *
 * @returns Array of liked event documents with band, venue, and likedAt timestamp
 *
 * @example
 * const likedEvents = await ctx.runQuery(api.events.getUserLikes);
 * // Display in "Saved Events" or "Interested" section
 */
export const getUserLikes = query({
  args: {},
  handler: async (ctx) => {
    const viewerContext = await buildViewerContext(ctx);
    const userId = viewerContext.userId;
    if (!userId) {
      return [];
    }
    return await listUserLikedEventsWithDetails(ctx, userId, viewerContext);
  },
});

/**
 * Checks the current user's RSVP and like status for a specific event.
 * Returns false for both if not authenticated.
 *
 * @param args.eventId - The Convex ID of the event to check
 * @returns Object with hasRsvp and hasLiked boolean flags
 *
 * @example
 * const status = await ctx.runQuery(api.events.getUserEventStatus, {
 *   eventId: event._id
 * });
 * // Use to render RSVP/Like button states
 * <button>{status.hasRsvp ? "Cancel RSVP" : "RSVP"}</button>
 */
export const getUserEventStatus = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event || !isPublicEvent(event)) {
      return {
        hasRsvp: false,
        hasLiked: false,
        hasPendingPoll: false,
        selectedPollOptionId: undefined,
        canAnswerPoll: false,
      };
    }

    const user = await getAuthenticatedUserOrNull(ctx);
    if (!user) {
      return {
        hasRsvp: false,
        hasLiked: false,
        hasPendingPoll: false,
        selectedPollOptionId: undefined,
        canAnswerPoll: false,
      };
    }

    const rsvp = await ctx.db
      .query("rsvps")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", user._id).eq("eventId", args.eventId)
      )
      .unique();

    const like = await ctx.db
      .query("likes")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", user._id).eq("eventId", args.eventId)
      )
      .unique();

    return {
      hasRsvp: !!rsvp,
      hasLiked: !!like,
      hasPendingPoll:
        !!rsvp && canAnswerEventPoll(event) && !rsvp.pollAnswerOptionId,
      selectedPollOptionId: rsvp?.pollAnswerOptionId,
      canAnswerPoll: !!rsvp && canAnswerEventPoll(event),
    };
  },
});

/**
 * Guest list summary for band workspace event management.
 * Returns preview guests for card rendering and capability flags.
 */
export const getEventGuestListSummary = query({
  args: {
    eventId: v.id("events"),
    bandId: v.id("bands"),
  },
  handler: async (ctx, args) => {
    const access = await resolveEventBandAccess(ctx, args.eventId, args.bandId);

    if (!access.canViewGuestList) {
      throw new Error("Not authorized for this band");
    }

    const previewRsvps = await ctx.db
      .query("rsvps")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .order("desc")
      .take(GUEST_LIST_PREVIEW_LIMIT);

    const previewGuests = (
      await Promise.all(
        previewRsvps.map(async (rsvp) => {
          const user = await ctx.db.get(rsvp.userId);
          if (!user) return null;

          return {
            rsvpId: rsvp._id,
            userId: user._id,
            name: user.name,
            avatar: user.avatar,
            rsvpType: getAttendanceStatus(rsvp),
          };
        })
      )
    ).filter((guest): guest is NonNullable<typeof guest> => guest !== null);

    return {
      totalCount: access.event.rsvpCount,
      previewGuests,
      canManage: access.canManageGuestList,
    };
  },
});

/**
 * Lists guests for an event guest-management panel.
 * Filters and search are applied within a capped RSVP set for safety.
 * Uses latest 501 RSVP rows to detect truncation and returns at most 500 rows.
 */
export const listEventGuests = query({
  args: {
    eventId: v.id("events"),
    bandId: v.id("bands"),
    rsvpType: v.optional(guestFilterTypeValidator),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const access = await resolveEventBandAccess(ctx, args.eventId, args.bandId);
    if (!access.canViewGuestList) {
      throw new Error("Not authorized for this band");
    }

    const filterType = args.rsvpType ?? "all";
    const searchQuery = args.search?.trim().toLowerCase() ?? "";
    const rsvps = await ctx.db
      .query("rsvps")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .order("desc")
      .take(GUEST_LIST_CAP + 1);

    const capReached = rsvps.length > GUEST_LIST_CAP;
    const cappedRsvps = capReached ? rsvps.slice(0, GUEST_LIST_CAP) : rsvps;

    const guestsWithUsers = await Promise.all(
      cappedRsvps.map(async (rsvp) => {
        const user = await ctx.db.get(rsvp.userId);
        if (!user) return null;

        const rsvpType = getAttendanceStatus(rsvp);

        return {
          rsvpId: rsvp._id,
          userId: user._id,
          name: user.name,
          avatar: user.avatar,
          rsvpType,
          rsvpedAt: rsvp.createdAt,
          attendedAt: rsvp.attendedAt,
        };
      })
    );

    const allGuests = guestsWithUsers.filter(
      (guest): guest is NonNullable<typeof guest> => guest !== null,
    );

    const counts = allGuests.reduce(
      (totals, guest) => {
        totals.total += 1;
        if (guest.rsvpType === "attended") {
          totals.attended += 1;
        } else {
          totals.onList += 1;
        }
        return totals;
      },
      { total: 0, onList: 0, attended: 0 },
    );

    const guests = allGuests
      .filter((guest) => {
        if (filterType !== "all" && guest.rsvpType !== filterType) {
          return false;
        }

        if (!searchQuery) {
          return true;
        }

        return guest.name.toLowerCase().includes(searchQuery);
      })
      .sort((a, b) => b.rsvpedAt - a.rsvpedAt);

    return {
      guests,
      capReached,
      cap: GUEST_LIST_CAP,
      counts,
      totalCount: access.event.rsvpCount,
      canManage: access.canManageGuestList,
    };
  },
});

/**
 * Sets attendance status for an RSVP'd guest.
 * Only band owners/admins can modify attendance.
 */
export const setEventGuestAttendance = mutation({
  args: {
    eventId: v.id("events"),
    bandId: v.id("bands"),
    rsvpId: v.id("rsvps"),
    attended: v.boolean(),
  },
  handler: async (ctx, args) => {
    const access = await resolveEventBandAccess(ctx, args.eventId, args.bandId);
    if (!access.canManageGuestList) {
      throw new Error("Not authorized for this band");
    }

    const rsvp = await ctx.db.get(args.rsvpId);
    if (!rsvp) {
      throw new Error("RSVP not found");
    }

    if (rsvp.eventId !== args.eventId) {
      throw new Error("RSVP does not belong to this event");
    }

    const currentStatus = getAttendanceStatus(rsvp);
    const nextStatus: GuestRsvpType = args.attended ? "attended" : "on_list";

    if (currentStatus === nextStatus) {
      return { changed: false, rsvpType: currentStatus };
    }

    if (nextStatus === "attended") {
      await ctx.db.patch(args.rsvpId, {
        attendanceStatus: "attended",
        attendedAt: Date.now(),
      });
      await incrementShowsAttended(ctx, rsvp.userId);
      await markTicketUsedForRsvp(ctx, rsvp, access.membership.userId);
    } else {
      await ctx.db.patch(args.rsvpId, {
        attendanceStatus: "on_list",
        attendedAt: undefined,
      });
      await decrementShowsAttended(ctx, rsvp.userId);
    }

    return {
      changed: true,
      rsvpType: nextStatus,
    };
  },
});

/**
 * Removes a guest RSVP from an event.
 * Only band owners/admins can remove guests.
 */
export const removeEventGuestRsvp = mutation({
  args: {
    eventId: v.id("events"),
    bandId: v.id("bands"),
    rsvpId: v.id("rsvps"),
  },
  handler: async (ctx, args) => {
    const access = await resolveEventBandAccess(ctx, args.eventId, args.bandId);
    if (!access.canManageGuestList) {
      throw new Error("Not authorized for this band");
    }

    const rsvp = await ctx.db.get(args.rsvpId);
    if (!rsvp) {
      throw new Error("RSVP not found");
    }

    if (rsvp.eventId !== args.eventId) {
      throw new Error("RSVP does not belong to this event");
    }

    if (getAttendanceStatus(rsvp) === "attended") {
      await decrementShowsAttended(ctx, rsvp.userId);
    }

    await revokeActiveTicketForRsvp(
      ctx,
      args.rsvpId,
      GUEST_REMOVED_REVOKE_REASON
    );

    await ctx.db.delete(args.rsvpId);

    await ctx.db.patch(access.event._id, {
      rsvpCount: Math.max(0, access.event.rsvpCount - 1),
    });

    return {
      action: "removed",
      eventId: args.eventId,
      rsvpId: args.rsvpId,
    };
  },
});
