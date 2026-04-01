import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  requireAuthenticatedUser,
  requireBandMember,
  requireBandRole,
} from "./utils/permissions";

const inviteResponseActionValidator = v.union(
  v.literal("accept"),
  v.literal("decline")
);

const EVENT_COHOST_INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

type EventCohostInviteStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "revoked"
  | "expired";

type EventCohostReadableCtx = QueryCtx | MutationCtx;

function toUniqueBandIds(bandIds: Id<"bands">[]): Id<"bands">[] {
  return Array.from(new Set(bandIds));
}

function isBandManagerRole(role: Doc<"bandMemberships">["role"]): boolean {
  return role === "owner" || role === "admin";
}

function isBandManagerAccessError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message === "Not authenticated" ||
      error.message === "User not found" ||
      error.message === "Not authorized for this band")
  );
}

async function requireBandManagerAccess(
  ctx: EventCohostReadableCtx,
  bandId: Id<"bands">,
  message: string
) {
  try {
    return await requireBandRole(ctx, bandId, ["owner", "admin"]);
  } catch (error) {
    if (isBandManagerAccessError(error)) {
      throw new ConvexError({
        code: "event_cohost_access_denied",
        message,
      });
    }
    throw error;
  }
}

function effectiveInviteStatus(
  invite: Pick<Doc<"eventCohostInvites">, "status" | "expiresAt">,
  now: number
): EventCohostInviteStatus {
  if (invite.status === "pending" && invite.expiresAt < now) {
    return "expired";
  }
  return invite.status;
}

async function requireBandsExist(
  ctx: EventCohostReadableCtx,
  bandIds: Id<"bands">[]
): Promise<void> {
  const existingBands = await Promise.all(bandIds.map((bandId) => ctx.db.get(bandId)));
  const missingBandId = existingBands.findIndex((band) => !band);
  if (missingBandId >= 0) {
    throw new ConvexError({
      code: "invalid_event_cohost_invite",
      message: "One or more invited bands were not found.",
    });
  }
}

/**
 * Returns all accepted co-host band IDs for a given event.
 */
export async function getAcceptedCohostBandIds(
  ctx: EventCohostReadableCtx,
  eventId: Id<"events">
): Promise<Id<"bands">[]> {
  const acceptedInvites = await ctx.db
    .query("eventCohostInvites")
    .withIndex("by_event_status", (q) => q.eq("eventId", eventId).eq("status", "accepted"))
    .collect();

  return toUniqueBandIds(acceptedInvites.map((invite) => invite.invitedBandId));
}

/**
 * Returns host + accepted co-host band IDs for a given event document.
 */
export async function getParticipatingBandIdsForEvent(
  ctx: EventCohostReadableCtx,
  event: Pick<Doc<"events">, "_id" | "bandId">
): Promise<Id<"bands">[]> {
  const acceptedCohostBandIds = await getAcceptedCohostBandIds(ctx, event._id);
  return toUniqueBandIds([event.bandId, ...acceptedCohostBandIds]);
}

/**
 * Creates pending co-host invites for an event.
 * Existing active pending/accepted invites are skipped.
 */
export async function createCohostInvitesForEvent(
  ctx: MutationCtx,
  args: {
    eventId: Id<"events">;
    hostBandId: Id<"bands">;
    invitedByBandId: Id<"bands">;
    invitedByUserId: Id<"users">;
    invitedBandIds: Id<"bands">[];
  }
): Promise<{
  createdInviteIds: Id<"eventCohostInvites">[];
  skippedBandIds: Id<"bands">[];
}> {
  const now = Date.now();
  if (args.invitedBandIds.some((bandId) => bandId === args.hostBandId)) {
    throw new ConvexError({
      code: "invalid_event_cohost_invite",
      message: "Host band cannot invite itself as a co-host.",
    });
  }
  const uniqueBandIds = toUniqueBandIds(args.invitedBandIds).filter(
    (bandId) => bandId !== args.hostBandId
  );

  if (uniqueBandIds.length === 0) {
    return { createdInviteIds: [], skippedBandIds: [] };
  }

  await requireBandsExist(ctx, uniqueBandIds);

  const createdInviteIds: Id<"eventCohostInvites">[] = [];
  const skippedBandIds: Id<"bands">[] = [];

  for (const invitedBandId of uniqueBandIds) {
    const existingInvites = await ctx.db
      .query("eventCohostInvites")
      .withIndex("by_event_invited_band", (q) =>
        q.eq("eventId", args.eventId).eq("invitedBandId", invitedBandId)
      )
      .collect();

    let shouldSkip = false;

    for (const invite of existingInvites) {
      const status = effectiveInviteStatus(invite, now);
      if (status === "expired" && invite.status === "pending") {
        await ctx.db.patch(invite._id, {
          status: "expired",
          respondedAt: now,
        });
        continue;
      }

      if (status === "pending" || status === "accepted") {
        shouldSkip = true;
        break;
      }
    }

    if (shouldSkip) {
      skippedBandIds.push(invitedBandId);
      continue;
    }

    const inviteId = await ctx.db.insert("eventCohostInvites", {
      eventId: args.eventId,
      hostBandId: args.hostBandId,
      invitedBandId,
      invitedByBandId: args.invitedByBandId,
      invitedByUserId: args.invitedByUserId,
      status: "pending",
      createdAt: now,
      expiresAt: now + EVENT_COHOST_INVITE_TTL_MS,
    });

    createdInviteIds.push(inviteId);
  }

  return { createdInviteIds, skippedBandIds };
}

/**
 * Creates co-host invites after an event has been committed.
 * This keeps event creation resilient even if invite creation hits a secondary failure.
 */
export const createInvitesAfterEventCreate = internalMutation({
  args: {
    eventId: v.id("events"),
    hostBandId: v.id("bands"),
    invitedByBandId: v.id("bands"),
    invitedByUserId: v.id("users"),
    invitedBandIds: v.array(v.id("bands")),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new ConvexError({
        code: "event_not_found",
        message: "Event not found.",
      });
    }

    if (event.bandId !== args.hostBandId) {
      throw new ConvexError({
        code: "invalid_event_cohost_invite",
        message: "Host band does not match the event owner.",
      });
    }

    return await createCohostInvitesForEvent(ctx, args);
  },
});

/**
 * Lists pending co-host invites for a band workspace.
 */
export const listBandPendingInvites = query({
  args: {
    bandId: v.id("bands"),
  },
  handler: async (ctx, args) => {
    const { membership } = await requireBandMember(ctx, args.bandId);
    const now = Date.now();

    const invites = await ctx.db
      .query("eventCohostInvites")
      .withIndex("by_invited_band_status", (q) =>
        q.eq("invitedBandId", args.bandId).eq("status", "pending")
      )
      .collect();

    const activeInvites = invites.filter((invite) => invite.expiresAt >= now);

    const resolvedInvites = await Promise.all(
      activeInvites.map(async (invite) => {
        const [event, hostBand, invitedByBand, invitedByUser] = await Promise.all([
          ctx.db.get(invite.eventId),
          ctx.db.get(invite.hostBandId),
          ctx.db.get(invite.invitedByBandId),
          ctx.db.get(invite.invitedByUserId),
        ]);

        if (!event || !hostBand) {
          return null;
        }

        const venue = event.venueId ? await ctx.db.get(event.venueId) : null;

        return {
          ...invite,
          event: {
            _id: event._id,
            title: event.title,
            dateTime: event.dateTime,
            status: event.status,
            venue,
          },
          hostBand,
          invitedByBand,
          invitedByUser: invitedByUser
            ? {
                _id: invitedByUser._id,
                name: invitedByUser.name,
                avatar: invitedByUser.avatar,
              }
            : null,
          canRespond: isBandManagerRole(membership.role),
        };
      })
    );

    return resolvedInvites
      .filter((invite): invite is NonNullable<typeof invite> => invite !== null)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Accepts or declines a pending co-host invite.
 * Only owner/admin in the invited band can respond.
 */
export const respondToInvite = mutation({
  args: {
    inviteId: v.id("eventCohostInvites"),
    action: inviteResponseActionValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const now = Date.now();

    const invite = await ctx.db.get(args.inviteId);
    if (!invite) {
      throw new ConvexError({
        code: "event_cohost_invite_not_found",
        message: "Co-host invite not found.",
      });
    }

    const event = await ctx.db.get(invite.eventId);
    if (!event) {
      throw new ConvexError({
        code: "event_not_found",
        message: "Event not found.",
      });
    }

    const membership = await ctx.db
      .query("bandMemberships")
      .withIndex("by_band_user", (q) =>
        q.eq("bandId", invite.invitedBandId).eq("userId", user._id)
      )
      .unique();

    if (!membership || !isBandManagerRole(membership.role)) {
      throw new ConvexError({
        code: "event_cohost_access_denied",
        message: "Only invited band owners and admins can respond to this invite.",
      });
    }

    if (invite.status !== "pending") {
      throw new ConvexError({
        code: "event_cohost_invite_closed",
        message: "This co-host invite is no longer pending.",
      });
    }

    if (invite.expiresAt < now) {
      await ctx.db.patch(invite._id, {
        status: "expired",
        respondedAt: now,
      });
      throw new ConvexError({
        code: "event_cohost_invite_expired",
        message: "This co-host invite has expired.",
      });
    }

    const nextStatus = args.action === "accept" ? "accepted" : "declined";

    await ctx.db.patch(invite._id, {
      status: nextStatus,
      respondedAt: now,
    });

    return {
      inviteId: invite._id,
      status: nextStatus,
      eventId: invite.eventId,
      invitedBandId: invite.invitedBandId,
    };
  },
});

/**
 * Invites one or more bands to co-host an event.
 * Caller must be owner/admin in an active participating band.
 */
export const inviteBandsToEvent = mutation({
  args: {
    eventId: v.id("events"),
    actingBandId: v.id("bands"),
    invitedBandIds: v.array(v.id("bands")),
  },
  handler: async (ctx, args) => {
    const { user } = await requireBandManagerAccess(
      ctx,
      args.actingBandId,
      "Only band owners and admins can invite co-hosts.",
    );

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new ConvexError({
        code: "event_not_found",
        message: "Event not found.",
      });
    }

    const participatingBandIds = await getParticipatingBandIdsForEvent(ctx, event);
    if (!participatingBandIds.includes(args.actingBandId)) {
      throw new ConvexError({
        code: "event_cohost_access_denied",
        message: "Only participating band owners and admins can invite co-hosts for this gig.",
      });
    }

    const { createdInviteIds, skippedBandIds } = await createCohostInvitesForEvent(ctx, {
      eventId: event._id,
      hostBandId: event.bandId,
      invitedByBandId: args.actingBandId,
      invitedByUserId: user._id,
      invitedBandIds: args.invitedBandIds,
    });

    if (createdInviteIds.length === 0 && skippedBandIds.length > 0) {
      throw new ConvexError({
        code: "event_cohost_invite_exists",
        message: "That band already has an active co-host invite for this gig.",
      });
    }

    return {
      eventId: event._id,
      createdInviteIds,
      skippedBandIds,
      createdCount: createdInviteIds.length,
    };
  },
});

/**
 * Revokes a pending or accepted co-host invite.
 * Caller must be owner/admin in a participating band.
 */
export const revokeEventInvite = mutation({
  args: {
    inviteId: v.id("eventCohostInvites"),
    actingBandId: v.id("bands"),
  },
  handler: async (ctx, args) => {
    await requireBandManagerAccess(
      ctx,
      args.actingBandId,
      "Only band owners and admins can manage co-host invites.",
    );

    const invite = await ctx.db.get(args.inviteId);
    if (!invite) {
      throw new ConvexError({
        code: "event_cohost_invite_not_found",
        message: "Co-host invite not found.",
      });
    }

    const event = await ctx.db.get(invite.eventId);
    if (!event) {
      throw new ConvexError({
        code: "event_not_found",
        message: "Event not found.",
      });
    }

    const participatingBandIds = await getParticipatingBandIdsForEvent(ctx, event);
    if (!participatingBandIds.includes(args.actingBandId)) {
      throw new ConvexError({
        code: "event_cohost_access_denied",
        message: "Only participating band owners and admins can manage co-host invites for this gig.",
      });
    }

    const now = Date.now();
    let nextStatus: EventCohostInviteStatus = invite.status;

    if (invite.status === "pending" && invite.expiresAt < now) {
      nextStatus = "expired";
    } else if (invite.status === "pending" || invite.status === "accepted") {
      nextStatus = "revoked";
    }

    if (nextStatus !== invite.status) {
      await ctx.db.patch(invite._id, {
        status: nextStatus,
        respondedAt: now,
      });
    }

    return {
      inviteId: invite._id,
      status: nextStatus,
      eventId: invite.eventId,
    };
  },
});

/**
 * Lists host/co-host roster and pending invites for an event.
 * Requires membership in a participating band for this event.
 */
export const listEventCohostRoster = query({
  args: {
    eventId: v.id("events"),
    bandId: v.id("bands"),
  },
  handler: async (ctx, args) => {
    const { membership } = await requireBandMember(ctx, args.bandId);

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const participatingBandIds = await getParticipatingBandIdsForEvent(ctx, event);
    if (!participatingBandIds.includes(args.bandId)) {
      throw new Error("Not authorized for this event");
    }

    const now = Date.now();
    const hostBand = await ctx.db.get(event.bandId);
    const invites = await ctx.db
      .query("eventCohostInvites")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const resolvedInvites = await Promise.all(
      invites.map(async (invite) => {
        const [invitedBand, invitedByBand, invitedByUser] = await Promise.all([
          ctx.db.get(invite.invitedBandId),
          ctx.db.get(invite.invitedByBandId),
          ctx.db.get(invite.invitedByUserId),
        ]);

        if (!invitedBand) {
          return null;
        }

        const status = effectiveInviteStatus(invite, now);

        return {
          ...invite,
          status,
          invitedBand,
          invitedByBand,
          invitedByUser: invitedByUser
            ? {
                _id: invitedByUser._id,
                name: invitedByUser.name,
                avatar: invitedByUser.avatar,
              }
            : null,
        };
      })
    );

    const normalizedInvites = resolvedInvites.filter(
      (invite): invite is NonNullable<typeof invite> => invite !== null
    );

    const acceptedInvites = normalizedInvites
      .filter((invite) => invite.status === "accepted")
      .sort((a, b) => (b.respondedAt ?? 0) - (a.respondedAt ?? 0));
    const acceptedCohostBands = acceptedInvites.map((invite) => invite.invitedBand);

    const pendingInvites = normalizedInvites
      .filter((invite) => invite.status === "pending")
      .sort((a, b) => b.createdAt - a.createdAt);

    return {
      event: {
        _id: event._id,
        title: event.title,
        dateTime: event.dateTime,
      },
      hostBand,
      acceptedCohostBands,
      acceptedInvites,
      pendingInvites,
      canManageInvites: isBandManagerRole(membership.role),
      canRespond: isBandManagerRole(membership.role),
    };
  },
});
