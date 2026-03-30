/**
 * @fileoverview Convex queries and mutations for band management.
 * Handles band profiles, statistics, and fan following functionality.
 * @module convex/bands
 */

import { ConvexError, v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  getAuthenticatedUserOrNull,
  requireAuthenticatedUser,
  requireBandMember,
  requireBandRole,
} from "./utils/permissions";

const PROFILE_VIEW_DEDUPE_WINDOW_MS = 6 * 60 * 60 * 1000;
const BAND_CREATION_ACCESS_CODE = "190304";
const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/webp",
]);
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

/** Validator for music genre field */
const genreValidator = v.union(
  v.literal("indie"),
  v.literal("rock"),
  v.literal("jazz"),
  v.literal("electronic"),
  v.literal("folk"),
  v.literal("pop"),
  v.literal("alternative")
);

/** Validator for social media links */
const socialLinksValidator = v.object({
  spotify: v.optional(v.string()),
  appleMusic: v.optional(v.string()),
  instagram: v.optional(v.string()),
  tiktok: v.optional(v.string()),
  youtube: v.optional(v.string()),
  website: v.optional(v.string()),
});

/** Validates that a URL uses a safe protocol (http or https) */
function isValidSocialUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/** Validates all non-empty social link URLs use safe protocols */
function validateSocialLinks(
  links: Record<string, string | undefined>
): void {
  for (const [key, value] of Object.entries(links)) {
    if (value && !isValidSocialUrl(value)) {
      throw new ConvexError({
        code: "invalid_social_link",
        message: `Invalid URL for ${key}: must use http or https.`,
      });
    }
  }
}

function normalizeSocialLinks(
  links:
    | {
        spotify?: string;
        appleMusic?: string;
        instagram?: string;
        tiktok?: string;
        youtube?: string;
        website?: string;
      }
    | undefined
) {
  if (!links) {
    return undefined;
  }

  const normalized = Object.fromEntries(
    Object.entries(links).flatMap(([key, value]) => {
      const trimmedValue = value?.trim();
      return trimmedValue ? [[key, trimmedValue]] : [];
    })
  ) as {
    spotify?: string;
    appleMusic?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    website?: string;
  };

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function uniqueById<T extends { _id: unknown }>(docs: T[]): T[] {
  const seen = new Set<string>();
  return docs.filter((doc) => {
    const key = String(doc._id);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function listBandParticipatingEvents(
  ctx: QueryCtx | MutationCtx,
  bandId: Id<"bands">
) {
  const [hostedEvents, acceptedInvites] = await Promise.all([
    ctx.db
      .query("events")
      .withIndex("by_band", (q) => q.eq("bandId", bandId))
      .collect(),
    ctx.db
      .query("eventCohostInvites")
      .withIndex("by_invited_band_status", (q) =>
        q.eq("invitedBandId", bandId).eq("status", "accepted")
      )
      .collect(),
  ]);

  const hostedEventIds = new Set(hostedEvents.map((event) => event._id));
  const cohostedEventIds = Array.from(
    new Set(acceptedInvites.map((invite) => invite.eventId))
  );
  const cohostedEvents = (
    await Promise.all(cohostedEventIds.map((eventId) => ctx.db.get(eventId)))
  ).filter((event): event is NonNullable<typeof event> => event !== null);

  return [
    ...hostedEvents,
    ...cohostedEvents.filter((event) => !hostedEventIds.has(event._id)),
  ];
}

/**
 * Gets a band by its Convex document ID.
 *
 * @param bandId - The Convex ID of the band
 * @returns The band document if found, null otherwise
 *
 * @example
 * const band = useQuery(api.bands.getById, { bandId: "k9x..." });
 */
export const getById = query({
  args: { bandId: v.id("bands") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.bandId);
  },
});

/**
 * Returns public band header data plus viewer-specific follow/membership state.
 * Requires authentication (route is app-scoped).
 */
export const getPublicBandProfile = query({
  args: { bandId: v.id("bands") },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);

    const band = await ctx.db.get(args.bandId);
    if (!band) {
      return null;
    }

    const [followers, savedEntry, membership] = await Promise.all([
      ctx.db
        .query("savedArtists")
        .withIndex("by_band", (q) => q.eq("bandId", args.bandId))
        .collect(),
      ctx.db
        .query("savedArtists")
        .withIndex("by_user_band", (q) =>
          q.eq("userId", user._id).eq("bandId", args.bandId)
        )
        .unique(),
      ctx.db
        .query("bandMemberships")
        .withIndex("by_band_user", (q) =>
          q.eq("bandId", args.bandId).eq("userId", user._id)
        )
        .unique(),
    ]);

    return {
      band,
      followerCount: followers.length,
      isFollowing: Boolean(savedEntry),
      viewerMembershipRole: membership?.role,
    };
  },
});

/**
 * Tracks a fan's personal view engagement for a band public profile.
 * Uses a 6-hour dedupe window per (user, band) pair to prevent noisy counts.
 */
export const trackProfileView = mutation({
  args: { bandId: v.id("bands") },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const band = await ctx.db.get(args.bandId);

    if (!band) {
      throw new Error("Band not found");
    }

    const now = Date.now();
    const existingEngagement = await ctx.db
      .query("bandProfileEngagements")
      .withIndex("by_user_band", (q) =>
        q.eq("userId", user._id).eq("bandId", args.bandId)
      )
      .unique();

    if (!existingEngagement) {
      await ctx.db.insert("bandProfileEngagements", {
        userId: user._id,
        bandId: args.bandId,
        viewCount: 1,
        firstViewedAt: now,
        lastViewedAt: now,
      });
      return { tracked: true, action: "created", viewCount: 1 };
    }

    if (now - existingEngagement.lastViewedAt < PROFILE_VIEW_DEDUPE_WINDOW_MS) {
      return {
        tracked: false,
        action: "deduped",
        viewCount: existingEngagement.viewCount,
      };
    }

    const nextViewCount = existingEngagement.viewCount + 1;
    await ctx.db.patch(existingEngagement._id, {
      viewCount: nextViewCount,
      lastViewedAt: now,
    });

    return { tracked: true, action: "incremented", viewCount: nextViewCount };
  },
});

/**
 * Legacy compatibility query returning the first band found for the user.
 * Prefer `listMyBands` in new web flows.
 *
 * @returns The band document if found, null otherwise
 *
 * @example
 * const band = useQuery(api.bands.getCurrentUserBand);
 * if (band) {
 *   console.log(`Your band: ${band.name}`);
 * }
 */
export const getCurrentUserBand = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUserOrNull(ctx);
    if (!user) {
      return null;
    }

    // Legacy fallback + compatibility helper:
    // prefer membership-based access, then fall back to legacy single-owner link.
    const membership = await ctx.db
      .query("bandMemberships")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (membership) {
      return await ctx.db.get(membership.bandId);
    }

    return await ctx.db
      .query("bands")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
  },
});

/**
 * Lists all bands the current user belongs to with membership metadata.
 * This is the primary source for profile context switcher options.
 */
export const listMyBands = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUserOrNull(ctx);
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

/**
 * Gets the specified band with aggregated statistics for the dashboard.
 * Includes shows this month, total RSVPs, and follower count.
 * Returns null if user is not authenticated, not a musician, or has no band.
 *
 * @returns Band document with stats property, or null
 *
 * @example
 * const bandWithStats = useQuery(api.bands.getBandWithStats, { bandId: "k9x..." });
 * if (bandWithStats) {
 *   console.log(`Total RSVPs: ${bandWithStats.stats.totalRsvps}`);
 * }
 */
export const getBandWithStats = query({
  args: {
    bandId: v.id("bands"),
  },
  handler: async (ctx, args) => {
    await requireBandMember(ctx, args.bandId);

    const band = await ctx.db.get(args.bandId);

    if (!band) {
      return null;
    }

    // Get events this band hosts or co-hosts.
    const events = await listBandParticipatingEvents(ctx, band._id);

    // Calculate stats
    const now = Date.now();
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartMs = monthStart.getTime();

    const showsThisMonth = events.filter(
      (e) =>
        typeof e.dateTime === "number" &&
        e.dateTime >= monthStartMs &&
        e.dateTime <= now
    ).length;

    const totalRsvps = events.reduce((sum, e) => sum + e.rsvpCount, 0);

    // Get followers (fans who saved this band)
    const followers = await ctx.db
      .query("savedArtists")
      .withIndex("by_band", (q) => q.eq("bandId", band._id))
      .collect();

    return {
      ...band,
      stats: {
        showsThisMonth,
        totalRsvps,
        newFans: followers.length,
      },
    };
  },
});

/**
 * Creates a new band profile for the authenticated user.
 * User may create multiple bands; ownership is represented through memberships.
 * Requires authentication.
 *
 * @param name - Band name (1-100 characters)
 * @param creationCode - Temporary access code required to create a band
 * @param genres - Array of music genres (1-5)
 * @param location - Band's home location
 * @param image - Optional profile image URL
 * @param bio - Optional biography (max 1000 characters)
 * @param memberCount - Optional number of members (1-50)
 * @param socialLinks - Optional social media links
 * @returns The new band's Convex document ID
 * @throws Error if not authenticated, user not found, or user already has a band
 *
 * @example
 * const createBand = useMutation(api.bands.create);
 * const bandId = await createBand({
 *   name: "The Local Heroes",
 *   genres: ["rock", "indie"],
 *   location: "Oakland, CA"
 * });
 */
export const create = mutation({
  args: {
    name: v.string(),
    creationCode: v.string(),
    genres: v.array(genreValidator),
    location: v.string(),
    image: v.optional(v.string()),
    bio: v.optional(v.string()),
    memberCount: v.optional(v.number()),
    socialLinks: v.optional(socialLinksValidator),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const name = args.name.trim();
    const location = args.location.trim();
    const creationCode = args.creationCode.trim();
    const bio = args.bio?.trim();
    const socialLinks = normalizeSocialLinks(args.socialLinks);

    if (!name) {
      throw new ConvexError({
        code: "invalid_band_name",
        message: "Band name is required.",
      });
    }

    if (!location) {
      throw new ConvexError({
        code: "invalid_band_location",
        message: "Location is required.",
      });
    }

    if (creationCode !== BAND_CREATION_ACCESS_CODE) {
      throw new ConvexError({
        code: "invalid_band_creation_code",
        message: "The band creation code is incorrect.",
      });
    }

    if (args.genres.length === 0) {
      throw new ConvexError({
        code: "invalid_band_genres",
        message: "Select at least one genre.",
      });
    }

    if (socialLinks) {
      validateSocialLinks(socialLinks);
    }

    const now = Date.now();

    const bandId = await ctx.db.insert("bands", {
      userId: user._id,
      name,
      genres: args.genres,
      location,
      image: args.image,
      bio: bio || undefined,
      memberCount: args.memberCount,
      socialLinks,
      createdAt: now,
    });

    await ctx.db.insert("bandMemberships", {
      bandId,
      userId: user._id,
      role: "owner",
      joinedAt: now,
    });

    return bandId;
  },
});

/**
 * Updates an existing band's profile information.
 * Owners and admins can update. All fields are optional for partial updates.
 * Requires authentication.
 *
 * @param bandId - The Convex ID of the band to update
 * @param name - Optional new band name
 * @param genres - Optional new genres array
 * @param location - Optional new location
 * @param image - Optional new profile image URL
 * @param bio - Optional new biography
 * @param memberCount - Optional new member count
 * @param socialLinks - Optional new social links
 * @returns The band's Convex document ID
 * @throws Error if not authenticated, user not found, or not authorized
 *
 * @example
 * const updateBand = useMutation(api.bands.update);
 * await updateBand({
 *   bandId: "k9x...",
 *   bio: "We play indie rock in the Bay Area"
 * });
 */
export const update = mutation({
  args: {
    bandId: v.id("bands"),
    name: v.optional(v.string()),
    genres: v.optional(v.array(genreValidator)),
    location: v.optional(v.string()),
    image: v.optional(v.string()),
    bio: v.optional(v.string()),
    memberCount: v.optional(v.number()),
    socialLinks: v.optional(socialLinksValidator),
  },
  handler: async (ctx, args) => {
    await requireBandRole(ctx, args.bandId, ["owner", "admin"]);

    if (args.socialLinks) {
      validateSocialLinks(args.socialLinks);
    }

    const { bandId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(args.bandId, filteredUpdates);

    return args.bandId;
  },
});

/**
 * Generates a short-lived Convex upload URL for band profile image uploads.
 * Owners/admins only.
 */
export const generateImageUploadUrl = mutation({
  args: {
    bandId: v.id("bands"),
  },
  handler: async (ctx, args) => {
    await requireBandRole(ctx, args.bandId, ["owner", "admin"]);
    const uploadUrl = await ctx.storage.generateUploadUrl();
    return { uploadUrl };
  },
});

/**
 * Commits a previously uploaded storage object as the band's profile image.
 * Owners/admins only. Replaces prior image storage object when present.
 */
export const setImageFromStorage = mutation({
  args: {
    bandId: v.id("bands"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await requireBandRole(ctx, args.bandId, ["owner", "admin"]);

    const band = await ctx.db.get(args.bandId);
    if (!band) {
      throw new Error("Band not found");
    }

    const metadata = await ctx.storage.getMetadata(args.storageId);
    if (!metadata) {
      throw new Error("Uploaded band image file not found.");
    }

    const mimeType = (metadata.contentType ?? "").toLowerCase();
    if (!IMAGE_MIME_TYPES.has(mimeType)) {
      throw new Error("Unsupported image format. Use JPEG, PNG, or WEBP.");
    }
    if (metadata.size > MAX_IMAGE_SIZE_BYTES) {
      throw new Error("Image file exceeds the 10 MB size limit.");
    }

    const imageUrl = await ctx.storage.getUrl(args.storageId);
    if (!imageUrl) {
      throw new Error("Unable to resolve image URL from storage.");
    }

    const previousStorageId = band.imageStorageId;
    await ctx.db.patch(args.bandId, {
      image: imageUrl,
      imageStorageId: args.storageId,
    });

    if (previousStorageId && previousStorageId !== args.storageId) {
      try {
        await ctx.storage.delete(previousStorageId);
      } catch {
        // Storage object may already be missing.
      }
    }

    return args.bandId;
  },
});

/**
 * Clears a band's profile image and deletes linked storage if present.
 * Owners/admins only.
 */
export const clearImage = mutation({
  args: {
    bandId: v.id("bands"),
  },
  handler: async (ctx, args) => {
    await requireBandRole(ctx, args.bandId, ["owner", "admin"]);

    const band = await ctx.db.get(args.bandId);
    if (!band) {
      throw new Error("Band not found");
    }

    const previousStorageId = band.imageStorageId;
    await ctx.db.patch(args.bandId, {
      image: undefined,
      imageStorageId: undefined,
    });

    if (previousStorageId) {
      try {
        await ctx.storage.delete(previousStorageId);
      } catch {
        // Storage object may already be missing.
      }
    }

    return args.bandId;
  },
});

/**
 * Permanently deletes a band and all linked records.
 * Owner-only and protected by typed confirmation phrase.
 */
export const deleteBand = mutation({
  args: {
    bandId: v.id("bands"),
    confirmationText: v.string(),
  },
  handler: async (ctx, args) => {
    const band = await ctx.db.get(args.bandId);
    if (!band) {
      throw new Error("Band not found");
    }

    await requireBandRole(ctx, args.bandId, ["owner"]);

    const expectedConfirmation = `I CONFIRM I WANT TO DELETE ${band.name}`;
    if (args.confirmationText.trim() !== expectedConfirmation) {
      throw new Error(
        `Confirmation text mismatch. Type exactly: ${expectedConfirmation}`
      );
    }

    const [
      memberships,
      invites,
      mediaSlots,
      savedArtists,
      profileEngagements,
      applications,
      conversations,
      hostedEvents,
      cohostInvitesByInvitedBand,
      cohostInvitesByHostBand,
      cohostInvitesByInvitedByBand,
      checkinStaffAssignedByBand,
      notificationsByBand,
    ] = await Promise.all([
      ctx.db
        .query("bandMemberships")
        .withIndex("by_band", (q) => q.eq("bandId", args.bandId))
        .collect(),
      ctx.db
        .query("bandInvites")
        .withIndex("by_band", (q) => q.eq("bandId", args.bandId))
        .collect(),
      ctx.db
        .query("bandMediaSlots")
        .withIndex("by_band_slot", (q) => q.eq("bandId", args.bandId))
        .collect(),
      ctx.db
        .query("savedArtists")
        .withIndex("by_band", (q) => q.eq("bandId", args.bandId))
        .collect(),
      ctx.db
        .query("bandProfileEngagements")
        .withIndex("by_band", (q) => q.eq("bandId", args.bandId))
        .collect(),
      ctx.db
        .query("applications")
        .withIndex("by_band", (q) => q.eq("bandId", args.bandId))
        .collect(),
      ctx.db
        .query("conversations")
        .withIndex("by_band", (q) => q.eq("bandId", args.bandId))
        .collect(),
      ctx.db
        .query("events")
        .withIndex("by_band", (q) => q.eq("bandId", args.bandId))
        .collect(),
      ctx.db
        .query("eventCohostInvites")
        .withIndex("by_invited_band", (q) => q.eq("invitedBandId", args.bandId))
        .collect(),
      ctx.db
        .query("eventCohostInvites")
        .withIndex("by_host_band", (q) => q.eq("hostBandId", args.bandId))
        .collect(),
      ctx.db
        .query("eventCohostInvites")
        .withIndex("by_invited_by_band", (q) =>
          q.eq("invitedByBandId", args.bandId)
        )
        .collect(),
      ctx.db
        .query("eventCheckinStaff")
        .withIndex("by_assigned_by_band", (q) =>
          q.eq("assignedByBandId", args.bandId)
        )
        .collect(),
      ctx.db
        .query("notifications")
        .withIndex("by_band", (q) => q.eq("bandId", args.bandId))
        .collect(),
    ]);

    const conversationCleanup = await Promise.all(
      conversations.map(async (conversation) => {
        const [messages, conversationReads] = await Promise.all([
          ctx.db
            .query("messages")
            .withIndex("by_conversation", (q) =>
              q.eq("conversationId", conversation._id)
            )
            .collect(),
          ctx.db
            .query("conversationReads")
            .withIndex("by_conversation_user", (q) =>
              q.eq("conversationId", conversation._id)
            )
            .collect(),
        ]);
        return {
          messages,
          conversationReads,
        };
      })
    );

    const hostedEventCleanup = await Promise.all(
      hostedEvents.map(async (event) => {
        const [likes, rsvps, tickets, checkinStaff, cohostInvites, notifications] =
          await Promise.all([
            ctx.db
              .query("likes")
              .withIndex("by_event", (q) => q.eq("eventId", event._id))
              .collect(),
            ctx.db
              .query("rsvps")
              .withIndex("by_event", (q) => q.eq("eventId", event._id))
              .collect(),
            ctx.db
              .query("eventTickets")
              .withIndex("by_event", (q) => q.eq("eventId", event._id))
              .collect(),
            ctx.db
              .query("eventCheckinStaff")
              .withIndex("by_event", (q) => q.eq("eventId", event._id))
              .collect(),
            ctx.db
              .query("eventCohostInvites")
              .withIndex("by_event", (q) => q.eq("eventId", event._id))
              .collect(),
            ctx.db
              .query("notifications")
              .withIndex("by_event", (q) => q.eq("eventId", event._id))
              .collect(),
          ]);

        return {
          likes,
          rsvps,
          tickets,
          checkinStaff,
          cohostInvites,
          notifications,
        };
      })
    );

    const conversationMessages = uniqueById(
      conversationCleanup.flatMap((entry) => entry.messages)
    );
    const conversationReads = uniqueById(
      conversationCleanup.flatMap((entry) => entry.conversationReads)
    );
    const eventLikes = uniqueById(
      hostedEventCleanup.flatMap((entry) => entry.likes)
    );
    const eventRsvps = uniqueById(
      hostedEventCleanup.flatMap((entry) => entry.rsvps)
    );
    const eventTickets = uniqueById(
      hostedEventCleanup.flatMap((entry) => entry.tickets)
    );
    const allEventCheckinStaff = uniqueById([
      ...hostedEventCleanup.flatMap((entry) => entry.checkinStaff),
      ...checkinStaffAssignedByBand,
    ]);
    const allEventCohostInvites = uniqueById([
      ...hostedEventCleanup.flatMap((entry) => entry.cohostInvites),
      ...cohostInvitesByInvitedBand,
      ...cohostInvitesByHostBand,
      ...cohostInvitesByInvitedByBand,
    ]);
    const allNotifications = uniqueById([
      ...hostedEventCleanup.flatMap((entry) => entry.notifications),
      ...notificationsByBand,
    ]);

    await Promise.all([
      ...eventLikes.map((row) => ctx.db.delete(row._id)),
      ...eventRsvps.map((row) => ctx.db.delete(row._id)),
      ...eventTickets.map((row) => ctx.db.delete(row._id)),
      ...allEventCheckinStaff.map((row) => ctx.db.delete(row._id)),
      ...allEventCohostInvites.map((row) => ctx.db.delete(row._id)),
      ...allNotifications.map((row) => ctx.db.delete(row._id)),
      ...conversationMessages.map((row) => ctx.db.delete(row._id)),
      ...conversationReads.map((row) => ctx.db.delete(row._id)),
      ...conversations.map((row) => ctx.db.delete(row._id)),
      ...applications.map((row) => ctx.db.delete(row._id)),
      ...savedArtists.map((row) => ctx.db.delete(row._id)),
      ...profileEngagements.map((row) => ctx.db.delete(row._id)),
      ...mediaSlots.map((row) => ctx.db.delete(row._id)),
      ...invites.map((row) => ctx.db.delete(row._id)),
      ...memberships.map((row) => ctx.db.delete(row._id)),
      ...hostedEvents.map((row) => ctx.db.delete(row._id)),
    ]);

    await ctx.db.delete(args.bandId);

    const storageIdsToDelete = new Set<string>();
    if (band.imageStorageId) {
      storageIdsToDelete.add(String(band.imageStorageId));
    }
    for (const slot of mediaSlots) {
      storageIdsToDelete.add(String(slot.mediaStorageId));
    }

    await Promise.all(
      Array.from(storageIdsToDelete).map(async (storageId) => {
        try {
          await ctx.storage.delete(storageId as Id<"_storage">);
        } catch {
          // Storage object may already be missing.
        }
      })
    );

    return { deleted: true, bandId: args.bandId };
  },
});

/**
 * Lists bands with optional genre filtering.
 * Used for band discovery features.
 *
 * @param genre - Optional genre to filter by
 * @param limit - Optional maximum number of results (default: 50)
 * @returns Array of band documents
 *
 * @example
 * // Get all bands
 * const bands = useQuery(api.bands.list, {});
 *
 * // Get rock bands only
 * const rockBands = useQuery(api.bands.list, { genre: "rock" });
 */
export const list = query({
  args: {
    genre: v.optional(genreValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    if (args.genre) {
      // Filter bands that include the requested genre in their genres array
      // Note: We need to filter in memory because genres is an array
      const allBands = await ctx.db.query("bands").collect();
      return allBands
        .filter((band) => band.genres && band.genres.includes(args.genre!))
        .slice(0, limit);
    }

    return await ctx.db.query("bands").take(limit);
  },
});

/**
 * Searches bands by name or location.
 * Case-insensitive partial matching.
 *
 * @param query - Search text to match against name or location
 * @param limit - Optional maximum number of results (default: 20)
 * @returns Array of matching band documents
 *
 * @example
 * const results = useQuery(api.bands.search, { query: "oakland" });
 */
export const search = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const searchQuery = args.query.toLowerCase();
    const limit = args.limit || 20;

    const bands = await ctx.db.query("bands").take(100);

    return bands
      .filter(
        (band) =>
          band.name.toLowerCase().includes(searchQuery) ||
          band.location.toLowerCase().includes(searchQuery)
      )
      .slice(0, limit);
  },
});

/**
 * Toggles the saved/followed status of a band for the current user.
 * If already saved, removes the save. If not saved, adds it.
 * Requires authentication.
 *
 * @param bandId - The Convex ID of the band to save/unsave
 * @returns Object indicating the action taken ("saved" or "unsaved")
 * @throws Error if not authenticated or user not found
 *
 * @example
 * const toggleSave = useMutation(api.bands.toggleSave);
 * const { action } = await toggleSave({ bandId: "k9x..." });
 * console.log(`Band ${action}`); // "Band saved" or "Band unsaved"
 */
export const toggleSave = mutation({
  args: { bandId: v.id("bands") },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);

    const existing = await ctx.db
      .query("savedArtists")
      .withIndex("by_user_band", (q) =>
        q.eq("userId", user._id).eq("bandId", args.bandId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { action: "unsaved" };
    }

    await ctx.db.insert("savedArtists", {
      userId: user._id,
      bandId: args.bandId,
      createdAt: Date.now(),
    });

    return { action: "saved" };
  },
});

/**
 * Gets all bands saved by the current user.
 * Returns empty array if not authenticated or user not found.
 *
 * @returns Array of saved band documents
 *
 * @example
 * const savedBands = useQuery(api.bands.getSavedBands);
 * console.log(`Following ${savedBands.length} bands`);
 */
export const getSavedBands = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUserOrNull(ctx);
    if (!user) {
      return [];
    }

    const saved = await ctx.db
      .query("savedArtists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const bands = await Promise.all(
      saved.map(async (s) => {
        const band = await ctx.db.get(s.bandId);
        return band;
      })
    );

    return bands.filter((b) => b !== null);
  },
});

/**
 * Gets analytics data for a band's dashboard charts and performance KPIs.
 * Includes total RSVPs, show count, checked-in attendance stats, chart data, and
 * audience breakdown percentages.
 *
 * @param bandId - The Convex ID of the band
 * @returns Analytics data object with chart-ready data and attendance KPI metrics
 * @throws Error if not authenticated or band not found
 */
export const getAnalytics = query({
  args: { bandId: v.id("bands") },
  handler: async (ctx, args) => {
    await requireBandMember(ctx, args.bandId);

    const band = await ctx.db.get(args.bandId);
    if (!band) {
      throw new Error("Band not found");
    }

    // Get all events this band hosts or co-hosts.
    const events = await listBandParticipatingEvents(ctx, args.bandId);

    // Get past events sorted by date (most recent first)
    const now = Date.now();
    const pastEvents = events
      .filter(
        (
          e
        ): e is typeof e & {
          dateTime: number;
        } => typeof e.dateTime === "number"
      )
      .filter((e) => e.dateTime < now)
      .sort((a, b) => b.dateTime - a.dateTime);

    // Count checked-in attendees for each past event.
    const attendedByEventId = new Map<string, number>();
    await Promise.all(
      pastEvents.map(async (event) => {
        const eventRsvps = await ctx.db
          .query("rsvps")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .collect();

        const attendedCount = eventRsvps.reduce(
          (sum, rsvp) => sum + ((rsvp.attendanceStatus ?? "on_list") === "attended" ? 1 : 0),
          0
        );
        attendedByEventId.set(event._id, attendedCount);
      })
    );

    const latestPastEvents = [...pastEvents].slice(0, 8);

    const venueNameCache = new Map<string, string>();
    const getVenueName = async (
      venueId: (typeof events)[number]["venueId"]
    ): Promise<string> => {
      if (!venueId) {
        return "Unknown Venue";
      }
      const cached = venueNameCache.get(venueId);
      if (cached) {
        return cached;
      }
      const venue = await ctx.db.get(venueId);
      const resolved = venue?.name || "Unknown Venue";
      venueNameCache.set(venueId, resolved);
      return resolved;
    };

    // Prepare chart data
    const eventComparison = await Promise.all(
      latestPastEvents.reverse().map(async (event) => {
        return {
          name: new Date(event.dateTime).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          rsvps: event.rsvpCount,
          attended: attendedByEventId.get(event._id) ?? 0,
          venueName: await getVenueName(event.venueId),
        };
      })
    );

    const totalCheckedInAcrossPastEvents = pastEvents.reduce(
      (sum, event) => sum + (attendedByEventId.get(event._id) ?? 0),
      0
    );
    const averageAttendancePerShow =
      pastEvents.length > 0 ? totalCheckedInAcrossPastEvents / pastEvents.length : 0;

    const bestEvent =
      pastEvents.length > 0
        ? [...pastEvents].sort((a, b) => {
            const attendedDiff =
              (attendedByEventId.get(b._id) ?? 0) - (attendedByEventId.get(a._id) ?? 0);
            if (attendedDiff !== 0) {
              return attendedDiff;
            }
            return b.dateTime - a.dateTime;
          })[0]
        : null;

    const lowestEvent =
      pastEvents.length > 0
        ? [...pastEvents].sort((a, b) => {
            const attendedDiff =
              (attendedByEventId.get(a._id) ?? 0) - (attendedByEventId.get(b._id) ?? 0);
            if (attendedDiff !== 0) {
              return attendedDiff;
            }
            return b.dateTime - a.dateTime;
          })[0]
        : null;

    const [bestAttendanceShow, lowestShow] = await Promise.all(
      [bestEvent, lowestEvent].map(async (event) => {
        if (!event) {
          return null;
        }

        return {
          eventId: event._id,
          eventName: event.title || "Untitled Show",
          venueName: await getVenueName(event.venueId),
          dateTime: event.dateTime,
          attended: attendedByEventId.get(event._id) ?? 0,
        };
      })
    );

    // Calculate traffic rate (simplified)
    const totalRsvps = events.reduce((sum, e) => sum + e.rsvpCount, 0);
    const eventsWithCapacity = events.filter(
      (
        e
      ): e is typeof e & {
        capacity: number;
      } => typeof e.capacity === "number" && Number.isFinite(e.capacity)
    );
    const avgCapacity =
      eventsWithCapacity.length > 0
        ? eventsWithCapacity.reduce((sum, e) => sum + e.capacity, 0) /
          eventsWithCapacity.length
        : 0;

    const newTrafficRate = avgCapacity > 0 ? (totalRsvps / avgCapacity) * 100 : 0;

    return {
      totalRsvps,
      eventCount: events.length,
      averageAttendancePerShow,
      bestAttendanceShow,
      lowestShow,
      eventComparison,
      trafficData: [
        { name: "Returning", value: Math.round(newTrafficRate * 0.6) },
        { name: "New", value: Math.round(newTrafficRate * 0.4) },
      ],
    };
  },
});
