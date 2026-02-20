import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export type BandMemberRole = "owner" | "admin" | "member";

type AuthCtx = QueryCtx | MutationCtx;

export async function requireAuthenticatedUser(ctx: AuthCtx) {
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

  return user;
}

export async function getBandMembership(
  ctx: AuthCtx,
  bandId: Id<"bands">,
  userId: Id<"users">
) {
  return await ctx.db
    .query("bandMemberships")
    .withIndex("by_band_user", (q) => q.eq("bandId", bandId).eq("userId", userId))
    .unique();
}

export async function requireBandRole(
  ctx: AuthCtx,
  bandId: Id<"bands">,
  allowedRoles: BandMemberRole[]
) {
  const user = await requireAuthenticatedUser(ctx);
  const membership = await getBandMembership(ctx, bandId, user._id);

  if (!membership || !allowedRoles.includes(membership.role)) {
    throw new Error("Not authorized for this band");
  }

  return {
    user,
    membership,
  };
}

export async function requireBandMember(ctx: AuthCtx, bandId: Id<"bands">) {
  return await requireBandRole(ctx, bandId, ["owner", "admin", "member"]);
}
