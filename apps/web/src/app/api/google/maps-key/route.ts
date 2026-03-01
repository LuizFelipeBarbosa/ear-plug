import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolveGoogleMapsApiKey(): string | null {
  const key =
    process.env.GOOGLE_MAPS_API_KEY ??
    globalThis.process?.env?.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ??
    null;

  if (!key) {
    return null;
  }

  const normalized = key.trim();
  return normalized.length > 0 ? normalized : null;
}

export async function GET() {
  const apiKey = resolveGoogleMapsApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { message: "Google Maps API key is not configured" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  return NextResponse.json(
    { apiKey },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    }
  );
}
