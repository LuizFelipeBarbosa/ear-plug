"use client";
import { useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { uploadToConvexStorage } from "@/lib/convexUpload";
import type {
  BandMediaSlotIndex,
  BandPostMediaType,
} from "@ear-plug/shared/types";
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 150 * 1024 * 1024;
const MAX_VIDEO_DURATION_SECONDS = 90;
const MAX_CAPTION_LENGTH = 120;
const MAX_LOCATION_LENGTH = 200;
export interface BandProfileSlot {
  slotIndex: BandMediaSlotIndex;
  isFilled: boolean;
  mediaType?: BandPostMediaType;
  mediaUrl?: string | null;
  mediaStorageId?: Id<"_storage">;
  caption?: string;
  location?: string;
  durationSeconds?: number;
  canEdit: boolean;
}
interface ExistingMediaInput {
  storageId: Id<"_storage">;
  mediaType: BandPostMediaType;
  durationSeconds?: number;
}
interface SaveSlotInput {
  slotIndex: BandMediaSlotIndex;
  caption?: string;
  location?: string;
  file?: File;
  existingMedia?: ExistingMediaInput;
}
function normalizeCaption(caption: string | undefined): string | undefined {
  const normalized = caption?.trim();
  if (!normalized) {
    return undefined;
  }
  if (normalized.length > MAX_CAPTION_LENGTH) {
    throw new Error(
      `Caption must be ${MAX_CAPTION_LENGTH} characters or fewer`,
    );
  }
  return normalized;
}
function normalizeLocation(location: string | undefined): string | undefined {
  const normalized = location?.trim();
  if (!normalized) {
    return undefined;
  }
  if (normalized.length > MAX_LOCATION_LENGTH) {
    throw new Error(
      `Location must be ${MAX_LOCATION_LENGTH} characters or fewer`,
    );
  }
  return normalized;
}
function detectMediaType(file: File): BandPostMediaType {
  if (file.type.startsWith("image/")) {
    return "image";
  }
  if (file.type.startsWith("video/")) {
    return "video";
  }
  throw new Error("Select a valid image or video file.");
}
async function getVideoDuration(file: File): Promise<number> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const duration = await new Promise<number>((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        resolve(video.duration || 0);
      };
      video.onerror = () => reject(new Error("Unable to read video metadata"));
      video.src = objectUrl;
    });
    return duration;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
async function validateFile(
  file: File,
  mediaType: BandPostMediaType,
): Promise<{ durationSeconds?: number }> {
  if (mediaType === "image") {
    if (!IMAGE_MIME_TYPES.has(file.type)) {
      throw new Error("Image format must be JPEG, PNG, or WEBP.");
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new Error("Image size must be 10 MB or less.");
    }
    return {};
  }
  if (!VIDEO_MIME_TYPES.has(file.type)) {
    throw new Error("Video format must be MP4, WEBM, or MOV.");
  }
  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    throw new Error("Video size must be 150 MB or less.");
  }
  const duration = await getVideoDuration(file);
  if (duration <= 0 || duration > MAX_VIDEO_DURATION_SECONDS) {
    throw new Error("Videos must be at most 90 seconds.");
  }
  return { durationSeconds: Math.ceil(duration) };
}
export function useBandMediaSlots(bandId: Id<"bands"> | undefined) {
  const slotResponse = useQuery(
    api.bandMediaSlots.listProfileSlots,
    bandId ? { bandId } : "skip",
  );
  const generateUploadUrl = useMutation(api.bandMediaSlots.generateUploadUrl);
  const upsertSlotMutation = useMutation(api.bandMediaSlots.upsertSlot);
  const clearSlotMutation = useMutation(api.bandMediaSlots.clearSlot);
  const slots = useMemo(() => {
    return (slotResponse?.slots ?? []) as unknown as BandProfileSlot[];
  }, [slotResponse?.slots]);
  const saveSlot = async (input: SaveSlotInput) => {
    if (!bandId) {
      throw new Error("Band ID is required to update media slots");
    }
    const caption = normalizeCaption(input.caption);
    const location = normalizeLocation(input.location);
    if (input.file) {
      const mediaType = detectMediaType(input.file);
      const { durationSeconds } = await validateFile(input.file, mediaType);
      const { uploadUrl } = await generateUploadUrl({ bandId });
      const uploadData = await uploadToConvexStorage(uploadUrl, input.file);
      return await upsertSlotMutation({
        bandId,
        slotIndex: input.slotIndex,
        storageId: uploadData.storageId as Id<"_storage">,
        mediaType,
        caption,
        location,
        durationSeconds,
      });
    }
    if (!input.existingMedia) {
      throw new Error("Select a file to fill this slot.");
    }
    return await upsertSlotMutation({
      bandId,
      slotIndex: input.slotIndex,
      storageId: input.existingMedia.storageId,
      mediaType: input.existingMedia.mediaType,
      caption,
      location,
      durationSeconds:
        input.existingMedia.mediaType === "video"
          ? input.existingMedia.durationSeconds
          : undefined,
    });
  };
  const clearSlot = async (slotIndex: BandMediaSlotIndex) => {
    if (!bandId) {
      throw new Error("Band ID is required to clear media slots");
    }
    return await clearSlotMutation({ bandId, slotIndex });
  };
  return { slots, isLoading: slotResponse === undefined, saveSlot, clearSlot };
}
