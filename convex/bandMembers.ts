import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  requireAuthenticatedUser,
  requireBandMember,
  requireBandRole,
} from "./utils/permissions";

const inviteRoleValidator = v.union(v.literal("admin"), v.literal("member"));
const memberRoleValidator = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("member")
);

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function effectiveInviteStatus(
  status: "pending" | "accepted" | "declined" | "revoked" | "expired",
  expiresAt: number,
  now: number
) {
  if (status === "pending" && expiresAt < now) {
    return "expired" as const;
  }
  return status;
}

async function createInviteForTargetUser(
  ctx: MutationCtx,
  args: {
    bandId: Id<"bands">;
    role: "admin" | "member";
    targetUserId: Id<"users">;
    inviterUserId: Id<"users">;
    targetEmail: string;
    targetPhoneNumber?: string;
  }
) {
  const now = Date.now();

  if (args.targetUserId === args.inviterUserId) {
    throw new Error("You cannot invite yourself");
  }

  const existingMembership = await ctx.db
    .query("bandMemberships")
    .withIndex("by_band_user", (q) =>
      q.eq("bandId", args.bandId).eq("userId", args.targetUserId)
    )
    .unique();

  if (existingMembership) {
    throw new Error("User is already a band member");
  }

  const pendingInvites = await ctx.db
    .query("bandInvites")
    .withIndex("by_band_target_status", (q) =>
      q
        .eq("bandId", args.bandId)
        .eq("targetUserId", args.targetUserId)
        .eq("status", "pending")
    )
    .collect();

  for (const invite of pendingInvites) {
    if (invite.expiresAt >= now) {
      throw new Error("User already has a pending invite");
    }
    await ctx.db.patch(invite._id, {
      status: "expired",
      respondedAt: now,
    });
  }

  return await ctx.db.insert("bandInvites", {
    bandId: args.bandId,
    targetUserId: args.targetUserId,
    email: args.targetEmail,
    phoneNumber: args.targetPhoneNumber,
    role: args.role,
    status: "pending",
    invitedBy: args.inviterUserId,
    createdAt: now,
    expiresAt: now + INVITE_TTL_MS,
  });
}

async function resolveActivePendingInvite(
  ctx: MutationCtx,
  bandId: Id<"bands">,
  targetUserId: Id<"users">
) {
  const now = Date.now();
  const pendingInvites = await ctx.db
    .query("bandInvites")
    .withIndex("by_band_target_status", (q) =>
      q
        .eq("bandId", bandId)
        .eq("targetUserId", targetUserId)
        .eq("status", "pending")
    )
    .collect();

  let hasActivePending = false;
  for (const invite of pendingInvites) {
    if (invite.expiresAt >= now) {
      hasActivePending = true;
      continue;
    }

    await ctx.db.patch(invite._id, {
      status: "expired",
      respondedAt: now,
    });
  }

  return hasActivePending;
}

export const listMyBands = query({
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

    if (!user) {
      return [];
    }

    const memberships = await ctx.db
      .query("bandMemberships")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const membershipsWithBand = await Promise.all(
      memberships.map(async (membership) => {
        const band = await ctx.db.get(membership.bandId);
        if (!band) {
          return null;
        }
        return {
          membership,
          band,
        };
      })
    );

    return membershipsWithBand
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      .sort((a, b) => a.band.name.localeCompare(b.band.name));
  },
});

export const listMembers = query({
  args: {
    bandId: v.id("bands"),
  },
  handler: async (ctx, args) => {
    await requireBandMember(ctx, args.bandId);

    const memberships = await ctx.db
      .query("bandMemberships")
      .withIndex("by_band", (q) => q.eq("bandId", args.bandId))
      .collect();

    const members = await Promise.all(
      memberships.map(async (membership) => {
        const user = await ctx.db.get(membership.userId);
        if (!user) {
          return null;
        }

        return {
          membership,
          user: {
            _id: user._id,
            _creationTime: user._creationTime,
            name: user.name,
            avatar: user.avatar,
            role: user.role,
            location: user.location,
          },
        };
      })
    );

    const roleOrder: Record<string, number> = { owner: 0, admin: 1, member: 2 };

    return members
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      .sort((a, b) => {
        const roleDiff =
          roleOrder[a.membership.role] - roleOrder[b.membership.role];
        if (roleDiff !== 0) {
          return roleDiff;
        }
        return a.user.name.localeCompare(b.user.name);
      });
  },
});

export const inviteExistingUserByEmail = mutation({
  args: {
    bandId: v.id("bands"),
    email: v.string(),
    role: inviteRoleValidator,
  },
  handler: async () => {
    throw new Error(
      "Inviting by email is disabled. Search and select a user from the assignable list."
    );
  },
});

export const inviteExistingUserByPhone = mutation({
  args: {
    bandId: v.id("bands"),
    phoneNumber: v.string(),
    role: inviteRoleValidator,
  },
  handler: async () => {
    throw new Error(
      "Inviting by phone is disabled. Search and select a user from the assignable list."
    );
  },
});

export const searchAssignableBandInviteUsers = query({
  args: {
    bandId: v.id("bands"),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireBandRole(ctx, args.bandId, ["owner", "admin"]);

    const normalizedQuery = args.query.trim().toLowerCase();
    if (normalizedQuery.length < 2) {
      return { users: [] };
    }

    const limit = Math.min(Math.max(Math.floor(args.limit ?? 8), 1), 20);
    const now = Date.now();
    const [users, memberships, invites] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db
        .query("bandMemberships")
        .withIndex("by_band", (q) => q.eq("bandId", args.bandId))
        .collect(),
      ctx.db
        .query("bandInvites")
        .withIndex("by_band", (q) => q.eq("bandId", args.bandId))
        .collect(),
    ]);

    const memberUserIds = new Set(memberships.map((membership) => membership.userId));
    const activePendingInviteUserIds = new Set(
      invites
        .filter(
          (invite) =>
            invite.status === "pending" &&
            effectiveInviteStatus(invite.status, invite.expiresAt, now) ===
              "pending"
        )
        .map((invite) => invite.targetUserId)
    );

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
        inviteState: memberUserIds.has(user._id)
          ? ("already_member" as const)
          : activePendingInviteUserIds.has(user._id)
            ? ("pending_invite" as const)
            : ("eligible" as const),
      }));

    return { users: matched };
  },
});

export const inviteExistingUser = mutation({
  args: {
    bandId: v.id("bands"),
    targetUserId: v.id("users"),
    role: inviteRoleValidator,
  },
  handler: async (ctx, args) => {
    const { user } = await requireBandRole(ctx, args.bandId, ["owner", "admin"]);

    const targetUser = await ctx.db.get(args.targetUserId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    if (targetUser._id === user._id) {
      throw new Error("You cannot invite yourself");
    }

    const existingMembership = await ctx.db
      .query("bandMemberships")
      .withIndex("by_band_user", (q) =>
        q.eq("bandId", args.bandId).eq("userId", args.targetUserId)
      )
      .unique();
    if (existingMembership) {
      return {
        action: "already_member" as const,
      };
    }

    const hasActivePendingInvite = await resolveActivePendingInvite(
      ctx,
      args.bandId,
      args.targetUserId
    );
    if (hasActivePendingInvite) {
      return {
        action: "already_pending" as const,
      };
    }

    try {
      const inviteId = await createInviteForTargetUser(ctx, {
        bandId: args.bandId,
        targetUserId: args.targetUserId,
        targetEmail: targetUser.email,
        targetPhoneNumber: targetUser.phoneNumber,
        role: args.role,
        inviterUserId: user._id,
      });

      return {
        action: "invited" as const,
        inviteId,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "User is already a band member") {
          return {
            action: "already_member" as const,
          };
        }
        if (error.message === "User already has a pending invite") {
          return {
            action: "already_pending" as const,
          };
        }
      }
      throw error;
    }
  },
});

export const listBandInvites = query({
  args: {
    bandId: v.id("bands"),
  },
  handler: async (ctx, args) => {
    await requireBandRole(ctx, args.bandId, ["owner", "admin"]);

    const now = Date.now();
    const invites = await ctx.db
      .query("bandInvites")
      .withIndex("by_band", (q) => q.eq("bandId", args.bandId))
      .order("desc")
      .collect();

    const invitesWithUsers = await Promise.all(
      invites.map(async (invite) => {
        const targetUser = await ctx.db.get(invite.targetUserId);
        const invitedByUser = await ctx.db.get(invite.invitedBy);
        return {
          ...invite,
          status: effectiveInviteStatus(invite.status, invite.expiresAt, now),
          targetUser: targetUser
            ? { _id: targetUser._id, name: targetUser.name, avatar: targetUser.avatar }
            : null,
          invitedByUser: invitedByUser
            ? { _id: invitedByUser._id, name: invitedByUser.name, avatar: invitedByUser.avatar }
            : null,
        };
      })
    );

    return invitesWithUsers;
  },
});

export const listMyPendingInvites = query({
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

    if (!user) {
      return [];
    }

    const now = Date.now();
    const invites = await ctx.db
      .query("bandInvites")
      .withIndex("by_target_user", (q) => q.eq("targetUserId", user._id))
      .collect();

    const pendingInvites = invites.filter((invite) => {
      return (
        invite.status === "pending" &&
        effectiveInviteStatus(invite.status, invite.expiresAt, now) === "pending"
      );
    });

    const invitesWithBand = await Promise.all(
      pendingInvites.map(async (invite) => {
        const band = await ctx.db.get(invite.bandId);
        const invitedByUser = await ctx.db.get(invite.invitedBy);
        return {
          ...invite,
          band,
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

    return invitesWithBand;
  },
});

export const acceptInvite = mutation({
  args: {
    inviteId: v.id("bandInvites"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const now = Date.now();
    const invite = await ctx.db.get(args.inviteId);

    if (!invite) {
      throw new Error("Invite not found");
    }

    if (invite.targetUserId !== user._id) {
      throw new Error("Not authorized for this invite");
    }

    if (invite.status !== "pending") {
      throw new Error("Invite is no longer pending");
    }

    if (invite.expiresAt < now) {
      await ctx.db.patch(invite._id, {
        status: "expired",
        respondedAt: now,
      });
      throw new Error("Invite has expired");
    }

    const existingMembership = await ctx.db
      .query("bandMemberships")
      .withIndex("by_band_user", (q) =>
        q.eq("bandId", invite.bandId).eq("userId", user._id)
      )
      .unique();

    let membershipId: Id<"bandMemberships">;
    if (existingMembership) {
      membershipId = existingMembership._id;
    } else {
      membershipId = await ctx.db.insert("bandMemberships", {
        bandId: invite.bandId,
        userId: user._id,
        role: invite.role,
        joinedAt: now,
        invitedBy: invite.invitedBy,
      });
    }

    await ctx.db.patch(invite._id, {
      status: "accepted",
      respondedAt: now,
    });

    return membershipId;
  },
});

export const declineInvite = mutation({
  args: {
    inviteId: v.id("bandInvites"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const now = Date.now();
    const invite = await ctx.db.get(args.inviteId);

    if (!invite) {
      throw new Error("Invite not found");
    }

    if (invite.targetUserId !== user._id) {
      throw new Error("Not authorized for this invite");
    }

    if (invite.status !== "pending") {
      throw new Error("Invite is no longer pending");
    }

    const nextStatus = invite.expiresAt < now ? "expired" : "declined";

    await ctx.db.patch(invite._id, {
      status: nextStatus,
      respondedAt: now,
    });

    return invite._id;
  },
});

export const revokeInvite = mutation({
  args: {
    inviteId: v.id("bandInvites"),
  },
  handler: async (ctx, args) => {
    const invite = await ctx.db.get(args.inviteId);
    if (!invite) {
      throw new Error("Invite not found");
    }

    await requireBandRole(ctx, invite.bandId, ["owner", "admin"]);

    if (invite.status !== "pending") {
      return invite._id;
    }

    await ctx.db.patch(invite._id, {
      status: "revoked",
      respondedAt: Date.now(),
    });

    return invite._id;
  },
});

export const updateMemberRole = mutation({
  args: {
    bandId: v.id("bands"),
    memberUserId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    await requireBandRole(ctx, args.bandId, ["owner", "admin"]);

    const membership = await ctx.db
      .query("bandMemberships")
      .withIndex("by_band_user", (q) =>
        q.eq("bandId", args.bandId).eq("userId", args.memberUserId)
      )
      .unique();

    if (!membership) {
      throw new Error("Membership not found");
    }

    if (membership.role === "owner") {
      throw new Error("Owner role can only change via transfer ownership");
    }

    await ctx.db.patch(membership._id, {
      role: args.role,
    });

    return membership._id;
  },
});

export const removeMember = mutation({
  args: {
    bandId: v.id("bands"),
    memberUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireBandRole(ctx, args.bandId, ["owner", "admin"]);

    const membership = await ctx.db
      .query("bandMemberships")
      .withIndex("by_band_user", (q) =>
        q.eq("bandId", args.bandId).eq("userId", args.memberUserId)
      )
      .unique();

    if (!membership) {
      throw new Error("Membership not found");
    }

    if (membership.role === "owner") {
      throw new Error("Cannot remove the owner from the band");
    }

    await ctx.db.delete(membership._id);
    return membership._id;
  },
});

export const transferOwnership = mutation({
  args: {
    bandId: v.id("bands"),
    newOwnerUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireBandRole(ctx, args.bandId, ["owner"]);

    const currentOwnerMembership = await ctx.db
      .query("bandMemberships")
      .withIndex("by_band_user", (q) =>
        q.eq("bandId", args.bandId).eq("userId", user._id)
      )
      .unique();

    if (!currentOwnerMembership || currentOwnerMembership.role !== "owner") {
      throw new Error("Only the owner can transfer ownership");
    }

    const newOwnerMembership = await ctx.db
      .query("bandMemberships")
      .withIndex("by_band_user", (q) =>
        q.eq("bandId", args.bandId).eq("userId", args.newOwnerUserId)
      )
      .unique();

    if (!newOwnerMembership) {
      throw new Error("New owner must already be a band member");
    }

    if (newOwnerMembership.role === "owner") {
      return newOwnerMembership._id;
    }

    await ctx.db.patch(currentOwnerMembership._id, {
      role: "admin",
    });

    await ctx.db.patch(newOwnerMembership._id, {
      role: "owner",
    });

    return newOwnerMembership._id;
  },
});

export const getMembership = query({
  args: {
    bandId: v.id("bands"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireBandMember(ctx, args.bandId);
    return await ctx.db
      .query("bandMemberships")
      .withIndex("by_band_user", (q) =>
        q.eq("bandId", args.bandId).eq("userId", args.userId)
      )
      .unique();
  },
});

export const listBandMembersByRole = query({
  args: {
    bandId: v.id("bands"),
    role: memberRoleValidator,
  },
  handler: async (ctx, args) => {
    await requireBandMember(ctx, args.bandId);

    const memberships = await ctx.db
      .query("bandMemberships")
      .withIndex("by_band", (q) => q.eq("bandId", args.bandId))
      .collect();

    return memberships.filter((membership) => membership.role === args.role);
  },
});
