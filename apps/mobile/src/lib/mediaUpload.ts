import type { ImagePickerAsset } from "expo-image-picker";
import type { BandPostMediaType } from "@ear-plug/shared/types";
import {
  BAND_MEDIA_VIDEO_MIME_TYPES,
  IMAGE_UPLOAD_MIME_TYPES,
  MAX_BAND_MEDIA_VIDEO_DURATION_SECONDS,
  MAX_BAND_MEDIA_VIDEO_UPLOAD_BYTES,
  MAX_IMAGE_UPLOAD_BYTES,
} from "@ear-plug/shared/constants";

const IMAGE_MIME_TYPES = new Set(
  IMAGE_UPLOAD_MIME_TYPES.map((mimeType) => mimeType.toLowerCase()),
);
const VIDEO_MIME_TYPES = new Set(
  BAND_MEDIA_VIDEO_MIME_TYPES.map((mimeType) => mimeType.toLowerCase()),
);

function normalizeMimeType(mimeType?: string | null): string | null {
  const normalized = mimeType?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function inferMimeTypeFromFileName(fileName?: string | null): string | null {
  const normalized = fileName?.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (normalized.endsWith(".png")) {
    return "image/png";
  }
  if (normalized.endsWith(".webp")) {
    return "image/webp";
  }
  if (normalized.endsWith(".mp4")) {
    return "video/mp4";
  }
  if (normalized.endsWith(".webm")) {
    return "video/webm";
  }
  if (normalized.endsWith(".mov")) {
    return "video/quicktime";
  }

  return null;
}

function resolveMimeType(asset: ImagePickerAsset): string | null {
  return normalizeMimeType(asset.mimeType) ?? inferMimeTypeFromFileName(asset.fileName);
}

export function validatePickedImageAsset(
  asset: ImagePickerAsset,
  label = "Image",
): { mimeType: string } {
  const mimeType = resolveMimeType(asset);
  if (!mimeType || !IMAGE_MIME_TYPES.has(mimeType)) {
    throw new Error(`${label} format must be JPEG, PNG, or WEBP.`);
  }

  if (
    typeof asset.fileSize === "number" &&
    Number.isFinite(asset.fileSize) &&
    asset.fileSize > MAX_IMAGE_UPLOAD_BYTES
  ) {
    throw new Error(`${label} size must be 10 MB or less.`);
  }

  return { mimeType };
}

export function validatePickedBandSlotAsset(
  asset: ImagePickerAsset,
): {
  mediaType: BandPostMediaType;
  mimeType: string;
  durationSeconds?: number;
} {
  const mimeType = resolveMimeType(asset);
  const mediaType =
    asset.type ??
    (mimeType?.startsWith("video/") ? "video" : mimeType?.startsWith("image/") ? "image" : null);

  if (!mediaType) {
    throw new Error("Select a valid image or video file.");
  }

  if (mediaType === "image") {
    const validatedImage = validatePickedImageAsset(asset, "Image");
    return { mediaType, mimeType: validatedImage.mimeType };
  }

  if (!mimeType || !VIDEO_MIME_TYPES.has(mimeType)) {
    throw new Error("Video format must be MP4, WEBM, or MOV.");
  }

  if (
    typeof asset.fileSize === "number" &&
    Number.isFinite(asset.fileSize) &&
    asset.fileSize > MAX_BAND_MEDIA_VIDEO_UPLOAD_BYTES
  ) {
    throw new Error("Video size must be 150 MB or less.");
  }

  const durationSeconds =
    typeof asset.duration === "number" && Number.isFinite(asset.duration)
      ? Math.ceil(asset.duration / 1000)
      : undefined;

  if (
    durationSeconds === undefined ||
    durationSeconds <= 0 ||
    durationSeconds > MAX_BAND_MEDIA_VIDEO_DURATION_SECONDS
  ) {
    throw new Error("Videos must be at most 90 seconds.");
  }

  return { mediaType, mimeType, durationSeconds };
}
