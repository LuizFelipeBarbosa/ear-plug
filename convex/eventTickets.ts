/**
 * @fileoverview Convex queries and mutations for event ticket management.
 * Handles ticket lifecycle, check-in access, staff management, and QR scanning.
 * @module convex/eventTickets
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  isPublicEvent,
  resolveEventBandAccess,
  resolveEventCheckinAccess,
  getAttendanceStatus,
  incrementShowsAttended,
  TICKET_QR_PREFIX,
  CHECKIN_STAFF_REVOKE_REASON,
} from "./events";
import type { EventTicketStatus, EventTicketScanStatus } from "./events";
import {
  getAuthenticatedUserOrNull,
  requireAuthenticatedUser,
} from "./utils/permissions";

// ---------------------------------------------------------------------------
// Private ticket helpers
// ---------------------------------------------------------------------------

function buildTicketQrValue(token: string): string {
  return `${TICKET_QR_PREFIX}:${token}`;
}

function parseTicketQrValue(value: string): string | null {
  const trimmed = value.trim();
  const prefix = `${TICKET_QR_PREFIX}:`;
  if (!trimmed.startsWith(prefix)) {
    return null;
  }

  const token = trimmed.slice(prefix.length).trim();
  if (!token || token.length < 16) {
    return null;
  }

  return token;
}

function formatTicketCode(token: string): string {
  return token.slice(0, 8).toUpperCase();
}

function generateTicketTokenCandidate(): string {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random()
    .toString(36)
    .slice(2)}`;
}

async function generateUniqueTicketToken(ctx: MutationCtx): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = generateTicketTokenCandidate();
    const existing = await ctx.db
      .query("eventTickets")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();

    if (!existing) {
      return token;
    }
  }

  throw new Error("Unable to generate ticket token");
}

async function findTicketByRsvpId(
  ctx: QueryCtx | MutationCtx,
  rsvpId: Id<"rsvps">
) {
  return await ctx.db
    .query("eventTickets")
    .withIndex("by_rsvp", (q) => q.eq("rsvpId", rsvpId))
    .unique();
}

// ---------------------------------------------------------------------------
// Exported ticket helpers (used by eventRsvps.ts)
// ---------------------------------------------------------------------------

export async function createTicketForRsvp(
  ctx: MutationCtx,
  rsvp: Pick<Doc<"rsvps">, "_id" | "eventId" | "userId">,
  status: EventTicketStatus = "active",
  issuedAt: number = Date.now(),
  usedByUserId?: Id<"users">
): Promise<Id<"eventTickets">> {
  const token = await generateUniqueTicketToken(ctx);
  return await ctx.db.insert("eventTickets", {
    eventId: rsvp.eventId,
    rsvpId: rsvp._id,
    userId: rsvp.userId,
    token,
    status,
    issuedAt,
    usedAt: status === "used" ? issuedAt : undefined,
    usedByUserId: status === "used" ? usedByUserId : undefined,
  });
}

async function ensureTicketForRsvp(
  ctx: MutationCtx,
  rsvp: Pick<Doc<"rsvps">, "_id" | "eventId" | "userId">
) {
  const existingTicket = await findTicketByRsvpId(ctx, rsvp._id);
  if (existingTicket) {
    return existingTicket;
  }

  const ticketId = await createTicketForRsvp(ctx, rsvp);
  const ticket = await ctx.db.get(ticketId);
  if (!ticket) {
    throw new Error("Ticket not found after creation");
  }
  return ticket;
}

export async function revokeActiveTicketForRsvp(
  ctx: MutationCtx,
  rsvpId: Id<"rsvps">,
  reason: string
): Promise<void> {
  const ticket = await findTicketByRsvpId(ctx, rsvpId);
  if (!ticket || ticket.status !== "active") {
    return;
  }

  await ctx.db.patch(ticket._id, {
    status: "revoked",
    revokedAt: Date.now(),
    revokedReason: reason,
  });
}

export async function markTicketUsedForRsvp(
  ctx: MutationCtx,
  rsvp: Pick<Doc<"rsvps">, "_id" | "eventId" | "userId">,
  usedByUserId: Id<"users">
): Promise<EventTicketStatus> {
  const ticket = await findTicketByRsvpId(ctx, rsvp._id);
  const usedAt = Date.now();

  if (!ticket) {
    await createTicketForRsvp(ctx, rsvp, "used", usedAt, usedByUserId);
    return "used";
  }

  if (ticket.status === "active") {
    await ctx.db.patch(ticket._id, {
      status: "used",
      usedAt,
      usedByUserId,
    });
    return "used";
  }

  return ticket.status;
}

// ---------------------------------------------------------------------------
// Exported Convex functions
// ---------------------------------------------------------------------------

/**
 * Returns ticket payload for the current RSVP'd user.
 * Includes QR payload for active tickets and lifecycle metadata.
 */
export const getMyEventTicket = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUserOrNull(ctx);
    if (!user) {
      return null;
    }

    const event = await ctx.db.get(args.eventId);
    if (!event || !isPublicEvent(event)) {
      return null;
    }

    const rsvp = await ctx.db
      .query("rsvps")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", user._id).eq("eventId", args.eventId)
      )
      .unique();

    if (!rsvp) {
      return null;
    }

    const [ticket, venue] = await Promise.all([
      findTicketByRsvpId(ctx, rsvp._id),
      ctx.db.get(event.venueId),
    ]);

    return {
      eventId: event._id,
      eventTitle: event.title,
      eventDateTime: event.dateTime,
      attendeeName: user.name,
      venue: venue
        ? {
            name: venue.name,
            address: venue.address,
            city: venue.city,
          }
        : null,
      requiresTicketBootstrap: !ticket,
      ticket: ticket
        ? {
            ticketId: ticket._id,
            status: ticket.status,
            issuedAt: ticket.issuedAt,
            usedAt: ticket.usedAt,
            revokedAt: ticket.revokedAt,
            ticketCode: formatTicketCode(ticket.token),
            qrValue:
              ticket.status === "active"
                ? buildTicketQrValue(ticket.token)
                : undefined,
          }
        : null,
    };
  },
});

/**
 * Creates a missing ticket for legacy RSVP rows.
 * Safe to call repeatedly: creates at most one ticket per RSVP.
 */
export const ensureMyEventTicket = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);

    const event = await ctx.db.get(args.eventId);
    if (!event || !isPublicEvent(event)) {
      throw new Error("This gig is not available.");
    }

    const rsvp = await ctx.db
      .query("rsvps")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", user._id).eq("eventId", args.eventId)
      )
      .unique();

    if (!rsvp) {
      throw new Error("RSVP not found");
    }

    const ticket = await ensureTicketForRsvp(ctx, rsvp);
    return {
      action: ticket.status === "active" ? "ready" : "restored",
      ticketId: ticket._id,
      status: ticket.status,
    };
  },
});

/**
 * Check-in access for scanner surfaces.
 */
export const getEventCheckinAccess = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const access = await resolveEventCheckinAccess(ctx, args.eventId);
    if (!access) {
      return {
        canScan: false,
        canManageStaff: false,
        role: null,
        managerBandIds: [],
      };
    }
    return {
      canScan: access.canScan,
      canManageStaff: access.canManageStaff,
      role: access.role,
      managerBandIds: access.managerBandIds,
    };
  },
});

/**
 * Lists active event check-in staff assignments.
 * Manager-only endpoint.
 */
export const listEventCheckinStaff = query({
  args: {
    eventId: v.id("events"),
    bandId: v.id("bands"),
  },
  handler: async (ctx, args) => {
    const access = await resolveEventBandAccess(ctx, args.eventId, args.bandId);
    if (!access.canManageGuestList) {
      throw new Error("Not authorized for this band");
    }

    const staffRows = await ctx.db
      .query("eventCheckinStaff")
      .withIndex("by_event_status", (q) =>
        q.eq("eventId", args.eventId).eq("status", "active")
      )
      .collect();

    const staff = (
      await Promise.all(
        staffRows.map(async (row) => {
          const user = await ctx.db.get(row.userId);
          if (!user) return null;

          return {
            userId: user._id,
            name: user.name,
            avatar: user.avatar,
            assignedAt: row.createdAt,
            assignedByBandId: row.assignedByBandId,
          };
        })
      )
    )
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => b.assignedAt - a.assignedAt);

    return { staff };
  },
});

/**
 * Searches platform users assignable as event check-in staff.
 * Manager-only endpoint.
 */
export const searchAssignableEventCheckinUsers = query({
  args: {
    eventId: v.id("events"),
    bandId: v.id("bands"),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const access = await resolveEventBandAccess(ctx, args.eventId, args.bandId);
    if (!access.canManageGuestList) {
      throw new Error("Not authorized for this band");
    }

    const normalizedQuery = args.query.trim().toLowerCase();
    if (normalizedQuery.length < 2) {
      return { users: [] };
    }

    const limit = Math.min(Math.max(Math.floor(args.limit ?? 8), 1), 20);
    const [users, activeStaffRows] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db
        .query("eventCheckinStaff")
        .withIndex("by_event_status", (q) =>
          q.eq("eventId", args.eventId).eq("status", "active")
        )
        .collect(),
    ]);

    const activeStaffUserIds = new Set(activeStaffRows.map((row) => row.userId));

    const matched = users
      .filter((user) =>
        user.name.trim().toLowerCase().includes(normalizedQuery)
      )
      .sort((a, b) => {
        const aName = a.name.trim();
        const bName = b.name.trim();
        const aLower = aName.toLowerCase();
        const bLower = bName.toLowerCase();
        const aStarts = aLower.startsWith(normalizedQuery);
        const bStarts = bLower.startsWith(normalizedQuery);

        if (aStarts !== bStarts) {
          return aStarts ? -1 : 1;
        }

        const byName = aName.localeCompare(bName, "en-US", {
          sensitivity: "base",
        });
        if (byName !== 0) {
          return byName;
        }

        return a.email.localeCompare(b.email, "en-US", {
          sensitivity: "base",
        });
      })
      .slice(0, limit)
      .map((user) => ({
        userId: user._id,
        name: user.name,
        avatar: user.avatar,
        alreadyAssigned: activeStaffUserIds.has(user._id),
      }));

    return { users: matched };
  },
});

/**
 * Assigns an existing user as event check-in staff by user ID.
 * Manager-only endpoint.
 */
export const assignEventCheckinStaff = mutation({
  args: {
    eventId: v.id("events"),
    bandId: v.id("bands"),
    staffUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const access = await resolveEventBandAccess(ctx, args.eventId, args.bandId);
    if (!access.canManageGuestList) {
      throw new Error("Not authorized for this band");
    }

    const targetUser = await ctx.db.get(args.staffUserId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    const existing = await ctx.db
      .query("eventCheckinStaff")
      .withIndex("by_event_user", (q) =>
        q.eq("eventId", args.eventId).eq("userId", args.staffUserId)
      )
      .unique();

    if (existing?.status === "active") {
      return {
        action: "already_active",
        staffUserId: args.staffUserId,
      };
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "active",
        assignedByUserId: access.membership.userId,
        assignedByBandId: args.bandId,
        revokedAt: undefined,
      });
      return {
        action: "reassigned",
        staffUserId: args.staffUserId,
      };
    }

    await ctx.db.insert("eventCheckinStaff", {
      eventId: args.eventId,
      userId: args.staffUserId,
      status: "active",
      assignedByUserId: access.membership.userId,
      assignedByBandId: args.bandId,
      createdAt: Date.now(),
    });

    return {
      action: "assigned",
      staffUserId: args.staffUserId,
    };
  },
});

/**
 * Assigns an existing user as event check-in staff.
 * Manager-only endpoint.
 */
export const assignEventCheckinStaffByEmail = mutation({
  args: {
    eventId: v.id("events"),
    bandId: v.id("bands"),
    email: v.string(),
  },
  handler: async () => {
    throw new Error(
      "Assigning check-in staff by email is disabled. Search and select a user instead."
    );
  },
});

/**
 * Revokes event check-in staff assignment.
 * Manager-only endpoint.
 */
export const removeEventCheckinStaff = mutation({
  args: {
    eventId: v.id("events"),
    bandId: v.id("bands"),
    staffUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const access = await resolveEventBandAccess(ctx, args.eventId, args.bandId);
    if (!access.canManageGuestList) {
      throw new Error("Not authorized for this band");
    }

    const assignment = await ctx.db
      .query("eventCheckinStaff")
      .withIndex("by_event_user", (q) =>
        q.eq("eventId", args.eventId).eq("userId", args.staffUserId)
      )
      .unique();

    if (!assignment) {
      return { action: "not_found" };
    }

    if (assignment.status === "revoked") {
      return { action: "already_revoked" };
    }

    await ctx.db.patch(assignment._id, {
      status: "revoked",
      revokedAt: Date.now(),
    });

    return {
      action: "revoked",
      staffUserId: args.staffUserId,
      reason: CHECKIN_STAFF_REVOKE_REASON,
    };
  },
});

/**
 * Scans and consumes an event ticket QR code.
 * Enforces one-time validation and attendance write-back.
 */
export const scanEventTicket = mutation({
  args: {
    eventId: v.id("events"),
    qrValue: v.string(),
  },
  handler: async (ctx, args) => {
    const access = await resolveEventCheckinAccess(ctx, args.eventId);
    if (!access || !access.canScan) {
      throw new Error("Not authorized to scan tickets for this event");
    }

    const token = parseTicketQrValue(args.qrValue);
    if (!token) {
      return {
        status: "invalid" as EventTicketScanStatus,
      };
    }

    const ticket = await ctx.db
      .query("eventTickets")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();

    if (!ticket || ticket.eventId !== args.eventId) {
      return {
        status: "invalid" as EventTicketScanStatus,
      };
    }

    const attendee = await ctx.db.get(ticket.userId);

    if (ticket.status === "revoked") {
      return {
        status: "revoked" as EventTicketScanStatus,
        attendeeName: attendee?.name,
        ticketCode: formatTicketCode(ticket.token),
      };
    }

    if (ticket.status === "used") {
      return {
        status: "already_used" as EventTicketScanStatus,
        attendeeName: attendee?.name,
        usedAt: ticket.usedAt,
        ticketCode: formatTicketCode(ticket.token),
      };
    }

    const rsvp = await ctx.db.get(ticket.rsvpId);
    if (!rsvp || rsvp.eventId !== args.eventId) {
      return {
        status: "invalid" as EventTicketScanStatus,
      };
    }

    const usedAt = Date.now();
    await ctx.db.patch(ticket._id, {
      status: "used",
      usedAt,
      usedByUserId: access.user._id,
    });

    if (getAttendanceStatus(rsvp) !== "attended") {
      await ctx.db.patch(rsvp._id, {
        attendanceStatus: "attended",
        attendedAt: usedAt,
      });
      await incrementShowsAttended(ctx, rsvp.userId);
    }

    return {
      status: "checked_in" as EventTicketScanStatus,
      attendeeName: attendee?.name,
      usedAt,
      ticketCode: formatTicketCode(ticket.token),
    };
  },
});
