/**
 * @fileoverview Convex queries and mutations for user management.
 * Handles user authentication, profile updates, and role management.
 * @module convex/users
 */

import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Gets the currently authenticated user from the database.
 * Uses Clerk authentication identity to look up the user by their Clerk ID.
 *
 * @returns The user document if authenticated and found, null otherwise
 *
 * @example
 * // In a React component
 * const user = useQuery(api.users.getCurrentUser);
 * if (user) {
 *   console.log(`Welcome, ${user.name}!`);
 * }
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    return user;
  },
});

/**
 * Gets a user by their Convex document ID.
 *
 * @param userId - The Convex ID of the user to retrieve
 * @returns The user document if found, null otherwise
 *
 * @example
 * const user = useQuery(api.users.getById, { userId: "k9x..." });
 */
export const getById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

/**
 * Gets a user by their Clerk authentication ID.
 * Useful for looking up users from Clerk webhook events.
 *
 * @param clerkId - The Clerk user ID (subject from JWT)
 * @returns The user document if found, null otherwise
 *
 * @example
 * const user = useQuery(api.users.getByClerkId, { clerkId: "user_abc123" });
 */
export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
  },
});

/**
 * Creates a new user or updates an existing user's basic info.
 * Called during sign-in to sync Clerk user data with Convex.
 * If the user doesn't exist, creates them with default "fan" role.
 *
 * @param clerkId - The Clerk user ID
 * @param email - User's email address
 * @param name - User's display name
 * @param avatar - Optional URL to user's avatar image
 * @returns The user's Convex document ID
 *
 * @example
 * await upsertUser({
 *   clerkId: "user_abc123",
 *   email: "user@example.com",
 *   name: "John Doe",
 *   avatar: "https://example.com/avatar.jpg"
 * });
 */
export const upsertUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        name: args.name,
        avatar: args.avatar,
      });
      return existingUser._id;
    }

    // Create new user with default role (will be updated during onboarding)
    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      avatar: args.avatar,
      role: "fan", // Default role
      memberSince: Date.now(),
      showsAttended: 0,
    });

    return userId;
  },
});

/**
 * Updates the current user's role during onboarding.
 * Requires authentication. Used when user selects "fan" or "musician".
 *
 * @param role - The new role ("fan" or "musician")
 * @returns The user's Convex document ID
 * @throws Error if not authenticated or user not found
 *
 * @example
 * const updateRole = useMutation(api.users.updateRole);
 * await updateRole({ role: "musician" });
 */
export const updateRole = mutation({
  args: {
    role: v.union(v.literal("fan"), v.literal("musician")),
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

    await ctx.db.patch(user._id, { role: args.role });

    return user._id;
  },
});

/**
 * Updates the current user's profile information.
 * Requires authentication. All fields are optional for partial updates.
 *
 * @param name - Optional new display name
 * @param location - Optional location (city/area)
 * @param avatar - Optional avatar image URL
 * @param topGenres - Optional array of preferred genres (max 5)
 * @returns The user's Convex document ID
 * @throws Error if not authenticated or user not found
 *
 * @example
 * const updateProfile = useMutation(api.users.updateProfile);
 * await updateProfile({
 *   name: "Jane Doe",
 *   location: "Oakland, CA",
 *   topGenres: ["rock", "indie"]
 * });
 */
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    location: v.optional(v.string()),
    avatar: v.optional(v.string()),
    topGenres: v.optional(
      v.array(
        v.union(
          v.literal("indie"),
          v.literal("rock"),
          v.literal("jazz"),
          v.literal("electronic"),
          v.literal("folk"),
          v.literal("pop"),
          v.literal("alternative")
        )
      )
    ),
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

    const updates: Partial<typeof args> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.location !== undefined) updates.location = args.location;
    if (args.avatar !== undefined) updates.avatar = args.avatar;
    if (args.topGenres !== undefined) updates.topGenres = args.topGenres;

    await ctx.db.patch(user._id, updates);

    return user._id;
  },
});

/**
 * Increments the current user's shows attended counter.
 * Called when a user attends an event they RSVP'd to.
 * Requires authentication.
 *
 * @throws Error if not authenticated or user not found
 *
 * @example
 * const incrementShows = useMutation(api.users.incrementShowsAttended);
 * await incrementShows();
 */
export const incrementShowsAttended = mutation({
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

    await ctx.db.patch(user._id, {
      showsAttended: (user.showsAttended || 0) + 1,
    });
  },
});

/**
 * Internal mutation to create a user from Clerk webhook.
 * Not callable from client - only from other Convex functions.
 * Creates user if they don't exist, returns existing ID if they do.
 *
 * @param clerkId - The Clerk user ID
 * @param email - User's email address
 * @param name - User's display name
 * @param avatar - Optional avatar image URL
 * @returns The user's Convex document ID
 *
 * @internal
 */
export const createUserFromClerk = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existingUser) {
      return existingUser._id;
    }

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      avatar: args.avatar,
      role: "fan",
      memberSince: Date.now(),
      showsAttended: 0,
    });
  },
});
