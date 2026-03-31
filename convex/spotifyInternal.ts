import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

const spotifyTopArtistPreviewValidator = v.object({
  spotifyArtistId: v.string(),
  name: v.string(),
  imageUrl: v.optional(v.string()),
  externalUrl: v.optional(v.string()),
});

export const upsertSpotifyPersonalization = internalMutation({
  args: {
    userId: v.id("users"),
    lastSyncedAt: v.number(),
    topGenres: v.array(
      v.union(
        v.literal("indie"),
        v.literal("rock"),
        v.literal("jazz"),
        v.literal("electronic"),
        v.literal("folk"),
        v.literal("pop"),
        v.literal("alternative"),
      ),
    ),
    topArtists: v.array(spotifyTopArtistPreviewValidator),
    matchedBandIds: v.array(v.id("bands")),
  },
  handler: async (ctx, args) => {
    const existingProfile = await ctx.db
      .query("spotifyProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, {
        lastSyncedAt: args.lastSyncedAt,
        topGenres: args.topGenres,
        topArtists: args.topArtists,
        matchedBandIds: args.matchedBandIds,
      });
      return existingProfile._id;
    }

    return await ctx.db.insert("spotifyProfiles", {
      userId: args.userId,
      lastSyncedAt: args.lastSyncedAt,
      topGenres: args.topGenres,
      topArtists: args.topArtists,
      matchedBandIds: args.matchedBandIds,
    });
  },
});
