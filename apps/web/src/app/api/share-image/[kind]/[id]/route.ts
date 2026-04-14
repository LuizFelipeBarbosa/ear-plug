import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../../convex/_generated/dataModel";

const DEFAULT_OG_IMAGE = "/branding/earplug-wordmark-light.png";
const MAX_DATA_URL_BYTES = 10 * 1024 * 1024;
const REDIRECT_CACHE_CONTROL =
  "public, max-age=300, s-maxage=300, stale-while-revalidate=300";
const INLINE_IMAGE_CACHE_CONTROL =
  "public, max-age=300, s-maxage=300, stale-while-revalidate=300";
const SAFE_IMAGE_CONTENT_TYPES = [
  "image/apng",
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
type SafeImageContentType = (typeof SAFE_IMAGE_CONTENT_TYPES)[number];
const SAFE_IMAGE_CONTENT_TYPE_SET = new Set<SafeImageContentType>(
  SAFE_IMAGE_CONTENT_TYPES,
);

function getServerConvexUrl() {
  return process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL ?? null;
}

function getDefaultImageUrl(request: Request) {
  return new URL(DEFAULT_OG_IMAGE, request.url);
}

function redirectToImage(url: URL) {
  return NextResponse.redirect(url, {
    headers: {
      "Cache-Control": REDIRECT_CACHE_CONTROL,
    },
  });
}

function redirectToDefaultImage(request: Request) {
  return redirectToImage(getDefaultImageUrl(request));
}

function isSafeImageContentType(
  contentType: string,
): contentType is SafeImageContentType {
  return SAFE_IMAGE_CONTENT_TYPE_SET.has(contentType as SafeImageContentType);
}

function getApproximateBase64Bytes(payload: string) {
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return Math.floor((payload.length * 3) / 4) - padding;
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;,]+)?(?:;charset=[^;,]+)?(;base64)?,(.*)$/s);
  if (!match) {
    return null;
  }

  const [, rawMimeType = "application/octet-stream", base64Flag, payload] = match;
  const mimeType = rawMimeType.trim().toLowerCase();

  if (!isSafeImageContentType(mimeType)) {
    return null;
  }

  if (!base64Flag) {
    return null;
  }

  try {
    if (getApproximateBase64Bytes(payload) > MAX_DATA_URL_BYTES) {
      return null;
    }

    const body = Buffer.from(payload, "base64");
    if (body.byteLength > MAX_DATA_URL_BYTES) {
      return null;
    }

    return {
      body,
      contentType: mimeType,
    };
  } catch {
    return null;
  }
}

function resolveSafeImageUrl(image: string, request: Request) {
  try {
    if (image.startsWith("/") && !image.startsWith("//")) {
      return new URL(image, request.url);
    }

    const resolved = new URL(image);
    if (resolved.protocol === "http:" || resolved.protocol === "https:") {
      return resolved;
    }
  } catch {
    return null;
  }

  return null;
}

async function getBandImage(kindId: string) {
  const convexUrl = getServerConvexUrl();
  if (!convexUrl) {
    return undefined;
  }

  const profile = await fetchQuery(
    api.bands.getPublicBandProfile,
    { bandId: kindId as Id<"bands"> },
    { url: convexUrl },
  );

  return profile?.band?.image;
}

async function getEventImage(kindId: string) {
  const convexUrl = getServerConvexUrl();
  if (!convexUrl) {
    return undefined;
  }

  const event = await fetchQuery(
    api.events.getById,
    { eventId: kindId as Id<"events"> },
    { url: convexUrl },
  );

  return event?.image;
}

export const runtime = "nodejs";

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      kind: string;
      id: string;
    }>;
  },
) {
  const { kind, id } = await params;

  try {
    const image =
      kind === "band"
        ? await getBandImage(id)
        : kind === "event"
          ? await getEventImage(id)
          : undefined;
    const normalizedImage = image?.trim();

    if (!normalizedImage) {
      return redirectToDefaultImage(request);
    }

    if (normalizedImage.startsWith("data:")) {
      const parsedDataUrl = parseDataUrl(normalizedImage);
      if (!parsedDataUrl) {
        return redirectToDefaultImage(request);
      }

      return new NextResponse(parsedDataUrl.body, {
        headers: {
          "Content-Type": parsedDataUrl.contentType,
          "Cache-Control": INLINE_IMAGE_CACHE_CONTROL,
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    const safeImageUrl = resolveSafeImageUrl(normalizedImage, request);
    if (!safeImageUrl) {
      return redirectToDefaultImage(request);
    }

    return redirectToImage(safeImageUrl);
  } catch {
    return redirectToDefaultImage(request);
  }
}
