/**
 * @fileoverview Convex queries and mutations for fixed band profile media slots.
 * @module convex/bandMediaSlots
 */

import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import {
  requireBandMember,
  requireBandRole,
} from "./utils/permissions";

const slotIndexValidator = v.union(
  v.literal(0),
  v.literal(1),
  v.literal(2),
  v.literal(3),
  v.literal(4),
  v.literal(5)
);

const mediaTypeValidator = v.union(v.literal("image"), v.literal("video"));

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/webp",
]);
const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 150 * 1024 * 1024;
const MAX_VIDEO_DURATION_SECONDS = 90;
const MAX_CAPTION_LENGTH = 120;
const MAX_LOCATION_LENGTH = 200;

function normalizeCaption(caption: string | undefined): string | undefined {
  const normalized = caption?.trim();
  if (!normalized) {
    return undefined;
  }

  if (normalized.length > MAX_CAPTION_LENGTH) {
    throw new Error(`Caption must be ${MAX_CAPTION_LENGTH} characters or fewer`);
  }

  return normalized;
}

function normalizeLocation(location: string | undefined): string | undefined {
  const normalized = location?.trim();
  if (!normalized) {
    return undefined;
  }

  if (normalized.length > MAX_LOCATION_LENGTH) {
    throw new Error(`Location must be ${MAX_LOCATION_LENGTH} characters or fewer`);
  }

  return normalized;
}

function toSlotIndex(value: number): 0 | 1 | 2 | 3 | 4 | 5 {
  if (value < 0 || value > 5) {
    throw new Error("Invalid slot index");
  }

  return value as 0 | 1 | 2 | 3 | 4 | 5;
}

/**
 * Lists all six profile media slots for a band in fixed index order.
 */
export const listProfileSlots = query({
  args: {
    bandId: v.id("bands"),
  },
  handler: async (ctx, args) => {
    const { membership } = await requireBandMember(ctx, args.bandId);
    const canEdit = membership.role === "owner" || membership.role === "admin";

    const slotDocs = await ctx.db
      .query("bandMediaSlots")
      .withIndex("by_band_slot", (q) => q.eq("bandId", args.bandId))
      .collect();

    const slotMap = new Map<number, Doc<"bandMediaSlots">>();
    for (const slot of slotDocs) {
      slotMap.set(slot.slotIndex, slot);
    }

    const slots = await Promise.all(
      [0, 1, 2, 3, 4, 5].map(async (slotIndex) => {
        const slot = slotMap.get(slotIndex);
        if (!slot) {
          return {
            slotIndex: toSlotIndex(slotIndex),
            isFilled: false,
            canEdit,
          };
        }

        const mediaUrl = await ctx.storage.getUrl(slot.mediaStorageId);

        return {
          slotIndex: toSlotIndex(slotIndex),
          isFilled: true,
          mediaType: slot.mediaType,
          mediaUrl,
          mediaStorageId: slot.mediaStorageId,
          caption: slot.caption,
          location: slot.location,
          durationSeconds: slot.durationSeconds,
          canEdit,
        };
      })
    );

    return { slots };
  },
});

/**
 * Lists all six profile media slots for public band profile surfaces.
 * Does not require authentication or band membership.
 */
export const listPublicSlots = query({
  args: {
    bandId: v.id("bands"),
  },
  handler: async (ctx, args) => {
    const slotDocs = await ctx.db
      .query("bandMediaSlots")
      .withIndex("by_band_slot", (q) => q.eq("bandId", args.bandId))
      .collect();

    const slotMap = new Map<number, Doc<"bandMediaSlots">>();
    for (const slot of slotDocs) {
      slotMap.set(slot.slotIndex, slot);
    }

    const slots = await Promise.all(
      [0, 1, 2, 3, 4, 5].map(async (slotIndex) => {
        const slot = slotMap.get(slotIndex);
        if (!slot) {
          return {
            slotIndex: toSlotIndex(slotIndex),
            isFilled: false,
            canEdit: false,
          };
        }

        const mediaUrl = await ctx.storage.getUrl(slot.mediaStorageId);

        return {
          slotIndex: toSlotIndex(slotIndex),
          isFilled: true,
          mediaType: slot.mediaType,
          mediaUrl,
          mediaStorageId: slot.mediaStorageId,
          caption: slot.caption,
          location: slot.location,
          durationSeconds: slot.durationSeconds,
          canEdit: false,
        };
      })
    );

    return { slots };
  },
});

/**
 * Generates a short-lived upload URL for profile slot media.
 * Only owner/admin can upload.
 */
export const generateUploadUrl = mutation({
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
 * Creates or updates one of the six profile media slots.
 */
export const upsertSlot = mutation({
  args: {
    bandId: v.id("bands"),
    slotIndex: slotIndexValidator,
    storageId: v.id("_storage"),
    mediaType: mediaTypeValidator,
    caption: v.optional(v.string()),
    location: v.optional(v.string()),
    durationSeconds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireBandRole(ctx, args.bandId, ["owner", "admin"]);

    const caption = normalizeCaption(args.caption);
    const location = normalizeLocation(args.location);
    const now = Date.now();

    const existingSlot = await ctx.db
      .query("bandMediaSlots")
      .withIndex("by_band_slot", (q) =>
        q.eq("bandId", args.bandId).eq("slotIndex", args.slotIndex)
      )
      .unique();

    const isCaptionOnlyUpdate =
      existingSlot !== null &&
      existingSlot.mediaStorageId === args.storageId &&
      existingSlot.mediaType === args.mediaType;

    if (isCaptionOnlyUpdate && existingSlot) {
      await ctx.db.patch(existingSlot._id, {
        caption,
        location,
        updatedAt: now,
      });

      return { slotId: existingSlot._id };
    }

    const metadata = await ctx.storage.getMetadata(args.storageId);
    if (!metadata) {
      throw new Error("Uploaded media file not found");
    }

    const mimeType = (metadata.contentType ?? "").toLowerCase();
    if (!mimeType) {
      throw new Error("Uploaded media is missing a content type");
    }

    if (args.mediaType === "image") {
      if (!IMAGE_MIME_TYPES.has(mimeType)) {
        throw new Error("Unsupported image format. Use JPEG, PNG, or WEBP.");
      }
      if (metadata.size > MAX_IMAGE_SIZE_BYTES) {
        throw new Error("Image file exceeds the 10 MB size limit.");
      }
    }

    if (args.mediaType === "video") {
      if (!VIDEO_MIME_TYPES.has(mimeType)) {
        throw new Error("Unsupported video format. Use MP4, WEBM, or MOV.");
      }
      if (metadata.size > MAX_VIDEO_SIZE_BYTES) {
        throw new Error("Video file exceeds the 150 MB size limit.");
      }
      if (
        args.durationSeconds === undefined ||
        args.durationSeconds <= 0 ||
        args.durationSeconds > MAX_VIDEO_DURATION_SECONDS
      ) {
        throw new Error("Video duration must be greater than 0 and at most 90 seconds.");
      }
    }

    if (existingSlot) {
      const previousStorageId = existingSlot.mediaStorageId;

      await ctx.db.patch(existingSlot._id, {
        mediaStorageId: args.storageId,
        mediaType: args.mediaType,
        caption,
        location,
        mimeType,
        fileSizeBytes: metadata.size,
        durationSeconds: args.mediaType === "video" ? args.durationSeconds : undefined,
        updatedAt: now,
      });

      if (previousStorageId !== args.storageId) {
        try {
          await ctx.storage.delete(previousStorageId);
        } catch {
          // Storage object may already be missing.
        }
      }

      return { slotId: existingSlot._id };
    }

    const slotId = await ctx.db.insert("bandMediaSlots", {
      bandId: args.bandId,
      slotIndex: args.slotIndex,
      mediaStorageId: args.storageId,
      mediaType: args.mediaType,
      caption,
      location,
      mimeType,
      fileSizeBytes: metadata.size,
      durationSeconds: args.mediaType === "video" ? args.durationSeconds : undefined,
      createdAt: now,
      updatedAt: now,
    });

    return { slotId };
  },
});

/**
 * Clears a single profile media slot and deletes the associated storage object.
 */
export const clearSlot = mutation({
  args: {
    bandId: v.id("bands"),
    slotIndex: slotIndexValidator,
  },
  handler: async (ctx, args) => {
    await requireBandRole(ctx, args.bandId, ["owner", "admin"]);

    const slot = await ctx.db
      .query("bandMediaSlots")
      .withIndex("by_band_slot", (q) =>
        q.eq("bandId", args.bandId).eq("slotIndex", args.slotIndex)
      )
      .unique();

    if (!slot) {
      return { cleared: true };
    }

    await ctx.db.delete(slot._id);

    try {
      await ctx.storage.delete(slot.mediaStorageId);
    } catch {
      // Storage object may already be missing.
    }

    return { cleared: true };
  },
});
