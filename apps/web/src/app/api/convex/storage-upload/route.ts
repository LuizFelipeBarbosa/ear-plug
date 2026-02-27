import { NextResponse } from "next/server";

const CONVEX_UPLOAD_PATHNAME = "/api/storage/upload";

function getAllowedConvexHost(): string | null {
  const convexUrl =
    process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL ?? null;
  if (!convexUrl) {
    return null;
  }

  try {
    return new URL(convexUrl).host;
  } catch {
    return null;
  }
}

function isAllowedUploadUrl(uploadUrl: string): boolean {
  const allowedHost = getAllowedConvexHost();
  if (!allowedHost) {
    return false;
  }

  try {
    const parsed = new URL(uploadUrl);
    return (
      parsed.protocol === "https:" &&
      parsed.host === allowedHost &&
      parsed.pathname === CONVEX_UPLOAD_PATHNAME &&
      parsed.searchParams.has("token")
    );
  } catch {
    return false;
  }
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  const uploadUrl = request.headers.get("x-convex-upload-url");
  if (!uploadUrl || !isAllowedUploadUrl(uploadUrl)) {
    return NextResponse.json({ message: "Invalid upload URL" }, { status: 400 });
  }

  const contentType =
    request.headers.get("content-type") ?? "application/octet-stream";
  const bodyBuffer = await request.arrayBuffer();

  if (bodyBuffer.byteLength === 0) {
    return NextResponse.json({ message: "Upload payload is empty" }, { status: 400 });
  }

  const upstreamResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
    },
    body: bodyBuffer,
  });

  const upstreamText = await upstreamResponse.text();
  const upstreamContentType =
    upstreamResponse.headers.get("content-type") ?? "application/json";

  return new Response(upstreamText, {
    status: upstreamResponse.status,
    headers: {
      "content-type": upstreamContentType,
    },
  });
}

