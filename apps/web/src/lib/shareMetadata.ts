import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

const SITE_NAME = "EarPlug";
const DEFAULT_OG_IMAGE = "/branding/earplug-wordmark-light.png";
const DEFAULT_BAND_DESCRIPTION = "Discover local bands on EarPlug.";
const DEFAULT_EVENT_DESCRIPTION = "Discover local live music events on EarPlug.";

function getServerConvexUrl() {
  return process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL ?? null;
}

function normalizeText(value: string | undefined | null) {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : undefined;
}

function resolvePreviewImage(
  image: string | undefined,
  shareImagePath?: string,
) {
  const normalizedImage = normalizeText(image);
  if (!normalizedImage) {
    return DEFAULT_OG_IMAGE;
  }

  if (normalizedImage.startsWith("data:") && shareImagePath) {
    return shareImagePath;
  }

  return normalizedImage;
}

function formatEventDate(timestamp: number | undefined) {
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) {
    return undefined;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

function buildRouteMetadata({
  title,
  description,
  canonicalPath,
  image,
  shareImagePath,
}: {
  title: string;
  description: string;
  canonicalPath: string;
  image?: string;
  shareImagePath?: string;
}): Metadata {
  const previewImage = resolvePreviewImage(image, shareImagePath);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      url: canonicalPath,
      siteName: SITE_NAME,
      locale: "en_US",
      type: "website",
      images: [
        {
          url: previewImage,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [previewImage],
    },
  };
}

function buildBandDescription(band: {
  name: string;
  location?: string;
  bio?: string;
}) {
  const bio = normalizeText(band.bio);
  if (bio) {
    return bio;
  }

  const location = normalizeText(band.location);
  return location
    ? `${band.name} profile from ${location} on EarPlug.`
    : `${band.name} profile on EarPlug.`;
}

function buildEventDescription(event: {
  title?: string;
  description?: string;
  dateTime?: number;
  band?: {
    name?: string;
  } | null;
  venue?: {
    name?: string;
  } | null;
}) {
  const description = normalizeText(event.description);
  if (description) {
    return description;
  }

  const title = normalizeText(event.title) ?? "Untitled Gig";
  const bandName = normalizeText(event.band?.name);
  const venueName = normalizeText(event.venue?.name);
  const dateLabel = formatEventDate(event.dateTime);

  const details = [bandName, venueName, dateLabel].filter(Boolean);
  if (details.length > 0) {
    return `${title} featuring ${details.join(" • ")}.`;
  }

  return DEFAULT_EVENT_DESCRIPTION;
}

export async function buildBandPageMetadata(bandId: string): Promise<Metadata> {
  const canonicalPath = `/bands/${bandId}`;
  const convexUrl = getServerConvexUrl();

  if (!convexUrl) {
    return buildRouteMetadata({
      title: "Band - Profile",
      description: DEFAULT_BAND_DESCRIPTION,
      canonicalPath,
    });
  }

  try {
    const profile = await fetchQuery(
      api.bands.getPublicBandProfile,
      { bandId: bandId as Id<"bands"> },
      { url: convexUrl },
    );

    const band = profile?.band;
    const title = `${normalizeText(band?.name) ?? "Band"} - Profile`;

    return buildRouteMetadata({
      title,
      description: band
        ? buildBandDescription(band)
        : DEFAULT_BAND_DESCRIPTION,
      canonicalPath,
      image: band?.image,
      shareImagePath: `/api/share-image/band/${bandId}`,
    });
  } catch {
    return buildRouteMetadata({
      title: "Band - Profile",
      description: DEFAULT_BAND_DESCRIPTION,
      canonicalPath,
    });
  }
}

export async function buildEventPageMetadata(eventId: string): Promise<Metadata> {
  const canonicalPath = `/gig/${eventId}`;
  const convexUrl = getServerConvexUrl();

  if (!convexUrl) {
    return buildRouteMetadata({
      title: "Untitled Gig",
      description: DEFAULT_EVENT_DESCRIPTION,
      canonicalPath,
    });
  }

  try {
    const event = await fetchQuery(
      api.events.getById,
      { eventId: eventId as Id<"events"> },
      { url: convexUrl },
    );

    const title = normalizeText(event?.title) ?? "Untitled Gig";

    return buildRouteMetadata({
      title,
      description: event
        ? buildEventDescription(event)
        : DEFAULT_EVENT_DESCRIPTION,
      canonicalPath,
      image: event?.image,
      shareImagePath: `/api/share-image/event/${eventId}`,
    });
  } catch {
    return buildRouteMetadata({
      title: "Untitled Gig",
      description: DEFAULT_EVENT_DESCRIPTION,
      canonicalPath,
    });
  }
}
