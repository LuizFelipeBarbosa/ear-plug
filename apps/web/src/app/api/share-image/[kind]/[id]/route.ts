import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../../convex/_generated/dataModel";

const DEFAULT_OG_IMAGE = "/branding/earplug-wordmark-light.png";

function getServerConvexUrl() {
  return process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL ?? null;
}

function getDefaultImageUrl(request: Request) {
  return new URL(DEFAULT_OG_IMAGE, request.url);
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;,]+)?(?:;charset=[^;,]+)?(;base64)?,(.*)$/s);
  if (!match) {
    return null;
  }

  const [, mimeType = "application/octet-stream", base64Flag, payload] = match;

  try {
    const body = base64Flag
      ? Buffer.from(payload, "base64")
      : Buffer.from(decodeURIComponent(payload), "utf8");

    return {
      body,
      contentType: mimeType,
    };
  } catch {
    return null;
  }
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

    if (!image) {
      return NextResponse.redirect(getDefaultImageUrl(request));
    }

    if (image.startsWith("data:")) {
      const parsedDataUrl = parseDataUrl(image);
      if (!parsedDataUrl) {
        return NextResponse.redirect(getDefaultImageUrl(request));
      }

      return new NextResponse(parsedDataUrl.body, {
        headers: {
          "Content-Type": parsedDataUrl.contentType,
          "Cache-Control": "public, max-age=300",
        },
      });
    }

    if (/^https?:\/\//.test(image)) {
      return NextResponse.redirect(image);
    }

    return NextResponse.redirect(new URL(image, request.url));
  } catch {
    return NextResponse.redirect(getDefaultImageUrl(request));
  }
}
