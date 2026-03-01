import { v } from "convex/values";
import { makeFunctionReference } from "convex/server";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { isE164Phone, normalizeInvitePhone } from "./utils/phone";

const getUsersForPhoneBackfillPageRef = makeFunctionReference<"query">(
  "users:getUsersForPhoneBackfillPage"
);
const setUserPhoneNumberRef = makeFunctionReference<"mutation">(
  "users:setUserPhoneNumber"
);

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

  throw new Error("Unable to generate unique ticket token");
}

export const backfillEventTicketsBatch = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 100, 1), 500);
    const page = await ctx.db.query("rsvps").order("asc").paginate({
      cursor: args.cursor ?? null,
      numItems: limit,
    });

    let created = 0;
    let skippedExisting = 0;
    for (const rsvp of page.page) {
      const existing = await ctx.db
        .query("eventTickets")
        .withIndex("by_rsvp", (q) => q.eq("rsvpId", rsvp._id))
        .unique();

      if (existing) {
        skippedExisting += 1;
        continue;
      }

      const status = rsvp.attendanceStatus === "attended" ? "used" : "active";
      const token = await generateUniqueTicketToken(ctx);
      const issuedAt = rsvp.createdAt;

      await ctx.db.insert("eventTickets", {
        eventId: rsvp.eventId,
        rsvpId: rsvp._id,
        userId: rsvp.userId,
        token,
        status,
        issuedAt,
        usedAt: status === "used" ? (rsvp.attendedAt ?? issuedAt) : undefined,
      });
      created += 1;
    }

    return {
      nextCursor: page.continueCursor ?? undefined,
      done: page.isDone,
      stats: {
        scanned: page.page.length,
        created,
        skippedExisting,
      },
    };
  },
});

export const validateEventTicketBackfill = internalQuery({
  args: {},
  handler: async (ctx) => {
    const [rsvps, tickets] = await Promise.all([
      ctx.db.query("rsvps").collect(),
      ctx.db.query("eventTickets").collect(),
    ]);

    const ticketByRsvpId = new Map(tickets.map((ticket) => [ticket.rsvpId, ticket]));
    let missingTickets = 0;
    let mismatchedEventRefs = 0;
    let mismatchedUserRefs = 0;

    for (const rsvp of rsvps) {
      const ticket = ticketByRsvpId.get(rsvp._id);
      if (!ticket) {
        missingTickets += 1;
        continue;
      }

      if (ticket.eventId !== rsvp.eventId) {
        mismatchedEventRefs += 1;
      }
      if (ticket.userId !== rsvp.userId) {
        mismatchedUserRefs += 1;
      }
    }

    return {
      totals: {
        rsvps: rsvps.length,
        tickets: tickets.length,
      },
      issues: {
        missingTickets,
        mismatchedEventRefs,
        mismatchedUserRefs,
      },
      valid:
        missingTickets === 0 &&
        mismatchedEventRefs === 0 &&
        mismatchedUserRefs === 0,
    };
  },
});

export const backfillBandWorkspaceBatch = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
    const now = Date.now();

    // Normalize legacy musician role in bounded chunks.
    const musicianUsers = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "musician"))
      .take(limit);

    let usersNormalized = 0;
    for (const user of musicianUsers) {
      await ctx.db.patch(user._id, { role: "fan" });
      usersNormalized += 1;
    }

    const bandPage = await ctx.db.query("bands").order("asc").paginate({
      cursor: args.cursor ?? null,
      numItems: limit,
    });
    const bands = bandPage.page;

    let ownerMembershipsCreated = 0;
    let ownerMembershipsPatched = 0;
    let membershipsDeduplicated = 0;
    let conversationReadsCreated = 0;

    for (const band of bands) {
      const ownerMembership = await ctx.db
        .query("bandMemberships")
        .withIndex("by_band_user", (q) =>
          q.eq("bandId", band._id).eq("userId", band.userId)
        )
        .unique();

      if (!ownerMembership) {
        await ctx.db.insert("bandMemberships", {
          bandId: band._id,
          userId: band.userId,
          role: "owner",
          joinedAt: band.createdAt ?? now,
        });
        ownerMembershipsCreated += 1;
      } else if (ownerMembership.role !== "owner") {
        await ctx.db.patch(ownerMembership._id, { role: "owner" });
        ownerMembershipsPatched += 1;
      }

      const members = await ctx.db
        .query("bandMemberships")
        .withIndex("by_band", (q) => q.eq("bandId", band._id))
        .collect();

      const membersByUserId = new Map<string, typeof members>();
      for (const member of members) {
        const existingMembers = membersByUserId.get(member.userId) ?? [];
        existingMembers.push(member);
        membersByUserId.set(member.userId, existingMembers);
      }

      const deduplicatedMembers: typeof members = [];
      for (const groupedMembers of membersByUserId.values()) {
        if (groupedMembers.length === 1) {
          deduplicatedMembers.push(groupedMembers[0]);
          continue;
        }

        const [keptMembership, ...duplicateMemberships] = groupedMembers.sort(
          (a, b) => {
            if (a.role === "owner" && b.role !== "owner") return -1;
            if (a.role !== "owner" && b.role === "owner") return 1;
            return a.joinedAt - b.joinedAt;
          }
        );

        deduplicatedMembers.push(keptMembership);
        for (const duplicate of duplicateMemberships) {
          await ctx.db.delete(duplicate._id);
          membershipsDeduplicated += 1;
        }
      }

      const conversations = await ctx.db
        .query("conversations")
        .withIndex("by_band", (q) => q.eq("bandId", band._id))
        .collect();

      for (const conversation of conversations) {
        for (const member of deduplicatedMembers) {
          const existingRead = await ctx.db
            .query("conversationReads")
            .withIndex("by_conversation_user", (q) =>
              q
                .eq("conversationId", conversation._id)
                .eq("userId", member.userId)
            )
            .unique();

          if (!existingRead) {
            await ctx.db.insert("conversationReads", {
              conversationId: conversation._id,
              userId: member.userId,
              lastReadAt: conversation.lastMessageAt,
            });
            conversationReadsCreated += 1;
          }
        }
      }
    }

    const nextCursor = bandPage.continueCursor ?? undefined;
    const done = bandPage.isDone && musicianUsers.length === 0;

    return {
      nextCursor,
      done,
      stats: {
        bandsProcessed: bands.length,
        usersNormalized,
        ownerMembershipsCreated,
        ownerMembershipsPatched,
        membershipsDeduplicated,
        conversationReadsCreated,
      },
    };
  },
});

export const validateBandWorkspaceBackfill = internalQuery({
  args: {},
  handler: async (ctx) => {
    const [bands, memberships, reads] = await Promise.all([
      ctx.db.query("bands").collect(),
      ctx.db.query("bandMemberships").collect(),
      ctx.db.query("conversationReads").collect(),
    ]);

    const bandMap = new Map(bands.map((band) => [band._id, band]));
    const membershipByBand = new Map<string, typeof memberships>();
    const membershipKeys = new Set<string>();
    let duplicateBandUserPairs = 0;
    let missingBandRefs = 0;
    let missingUserRefs = 0;

    for (const membership of memberships) {
      const byBand = membershipByBand.get(membership.bandId) ?? [];
      byBand.push(membership);
      membershipByBand.set(membership.bandId, byBand);

      const key = `${membership.bandId}:${membership.userId}`;
      if (membershipKeys.has(key)) {
        duplicateBandUserPairs += 1;
      } else {
        membershipKeys.add(key);
      }

      const [bandDoc, userDoc] = await Promise.all([
        ctx.db.get(membership.bandId),
        ctx.db.get(membership.userId),
      ]);

      if (!bandDoc) {
        missingBandRefs += 1;
      }
      if (!userDoc) {
        missingUserRefs += 1;
      }
    }

    let bandsMissingOwnerMembership = 0;
    let bandsWithMultipleOwners = 0;
    for (const band of bands) {
      const bandMemberships = membershipByBand.get(band._id) ?? [];
      const owners = bandMemberships.filter(
        (membership) => membership.role === "owner"
      );
      if (owners.length === 0) {
        bandsMissingOwnerMembership += 1;
      }
      if (owners.length > 1) {
        bandsWithMultipleOwners += 1;
      }
    }

    let invalidConversationReadRefs = 0;
    for (const read of reads) {
      const [conversation, user] = await Promise.all([
        ctx.db.get(read.conversationId),
        ctx.db.get(read.userId),
      ]);

      if (!conversation || !user) {
        invalidConversationReadRefs += 1;
      }
    }

    // Legacy compatibility check: bands with mismatched legacy owner link.
    let legacyOwnerMismatch = 0;
    for (const band of bands) {
      const bandMemberships = membershipByBand.get(band._id) ?? [];
      const hasLegacyOwner = bandMemberships.some(
        (membership) =>
          membership.userId === band.userId && membership.role === "owner"
      );
      if (!hasLegacyOwner) {
        legacyOwnerMismatch += 1;
      }
    }

    return {
      totals: {
        bands: bands.length,
        memberships: memberships.length,
        conversationReads: reads.length,
      },
      issues: {
        bandsMissingOwnerMembership,
        bandsWithMultipleOwners,
        duplicateBandUserPairs,
        missingBandRefs,
        missingUserRefs,
        invalidConversationReadRefs,
        legacyOwnerMismatch,
      },
      valid: [
        bandsMissingOwnerMembership,
        bandsWithMultipleOwners,
        duplicateBandUserPairs,
        missingBandRefs,
        missingUserRefs,
        invalidConversationReadRefs,
        legacyOwnerMismatch,
      ].every((count) => count === 0),
      bandMapSize: bandMap.size,
    };
  },
});

const CLERK_USERS_API_BASE = "https://api.clerk.com/v1/users";

function getPrimaryPhoneFromClerkUser(clerkUser: {
  primary_phone_number_id?: string | null;
  phone_numbers?: Array<{
    id?: string;
    phone_number?: string;
  }>;
}) {
  const phoneNumbers = clerkUser.phone_numbers ?? [];
  if (phoneNumbers.length === 0) {
    return undefined;
  }

  if (clerkUser.primary_phone_number_id) {
    const match = phoneNumbers.find(
      (entry) => entry.id === clerkUser.primary_phone_number_id
    );
    if (match?.phone_number) {
      return match.phone_number;
    }
  }

  return phoneNumbers[0]?.phone_number;
}

export const backfillUserPhonesFromClerkBatch = internalAction({
  args: {
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const secret = process.env.CLERK_SECRET_KEY;
    if (!secret) {
      throw new Error(
        "CLERK_SECRET_KEY is required in Convex environment for phone backfill"
      );
    }

    const limit = Math.min(Math.max(args.limit ?? 25, 1), 50);
    const page = await ctx.runQuery(getUsersForPhoneBackfillPageRef, {
      cursor: args.cursor,
      limit,
    });

    let updated = 0;
    let alreadyUpToDate = 0;
    let missingInClerk = 0;
    let invalidPhoneFormat = 0;
    let clerkUserMissing = 0;
    let fetchErrors = 0;

    for (const user of page.users) {
      let response: Response;
      try {
        response = await fetch(
          `${CLERK_USERS_API_BASE}/${encodeURIComponent(user.clerkId)}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${secret}`,
              "Content-Type": "application/json",
            },
          }
        );
      } catch {
        fetchErrors += 1;
        continue;
      }

      if (!response.ok) {
        if (response.status === 404) {
          clerkUserMissing += 1;
        } else {
          fetchErrors += 1;
        }
        continue;
      }

      const clerkUser = (await response.json()) as {
        primary_phone_number_id?: string | null;
        phone_numbers?: Array<{
          id?: string;
          phone_number?: string;
        }>;
      };

      const primaryPhone = getPrimaryPhoneFromClerkUser(clerkUser);
      if (!primaryPhone) {
        missingInClerk += 1;
        continue;
      }

      const normalized = normalizeInvitePhone(primaryPhone);
      if (!normalized.ok) {
        invalidPhoneFormat += 1;
        continue;
      }

      if (user.phoneNumber === normalized.e164) {
        alreadyUpToDate += 1;
        continue;
      }

      await ctx.runMutation(setUserPhoneNumberRef, {
        userId: user._id,
        phoneNumber: normalized.e164,
      });
      updated += 1;
    }

    return {
      nextCursor: page.nextCursor,
      done: page.done,
      stats: {
        usersProcessed: page.users.length,
        updated,
        alreadyUpToDate,
        missingInClerk,
        invalidPhoneFormat,
        clerkUserMissing,
        fetchErrors,
      },
    };
  },
});

export const validateUserPhoneBackfill = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    let usersMissingPhone = 0;
    let invalidPhoneFormatCount = 0;

    const seen = new Map<string, number>();
    for (const user of users) {
      if (!user.phoneNumber) {
        usersMissingPhone += 1;
        continue;
      }

      const normalized = normalizeInvitePhone(user.phoneNumber);
      if (!normalized.ok || !isE164Phone(user.phoneNumber)) {
        invalidPhoneFormatCount += 1;
        continue;
      }

      seen.set(user.phoneNumber, (seen.get(user.phoneNumber) ?? 0) + 1);
    }

    let duplicatePhoneCount = 0;
    for (const count of seen.values()) {
      if (count > 1) {
        duplicatePhoneCount += count - 1;
      }
    }

    return {
      totals: {
        users: users.length,
      },
      usersMissingPhone,
      duplicatePhoneCount,
      invalidPhoneFormatCount,
      valid:
        usersMissingPhone === 0 &&
        duplicatePhoneCount === 0 &&
        invalidPhoneFormatCount === 0,
    };
  },
});
