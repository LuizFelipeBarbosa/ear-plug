import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function resolveGoogleMapsApiKey(): string | null {
  const legacyPublicKey =
    globalThis.process?.env?.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? null;
  const key = process.env.GOOGLE_MAPS_API_KEY ?? legacyPublicKey;

  if (!key) {
    return null;
  }

  const normalized = key.trim();
  return normalized.length > 0 ? normalized : null;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { message: "Unauthorized" },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

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
