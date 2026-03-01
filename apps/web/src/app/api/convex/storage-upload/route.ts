import { NextResponse } from "next/server";

const CONVEX_UPLOAD_PATHNAME = "/api/storage/upload";
const MAX_UPLOAD_BYTES = 160 * 1024 * 1024;

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

async function readRequestBodyWithLimit(
  request: Request,
  maxBytes: number
): Promise<ArrayBuffer> {
  if (!request.body) {
    return await request.arrayBuffer();
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (!value) {
      continue;
    }

    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      throw new Error("payload_too_large");
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return merged.buffer;
}

export async function POST(request: Request) {
  const uploadUrl = request.headers.get("x-convex-upload-url");
  if (!uploadUrl || !isAllowedUploadUrl(uploadUrl)) {
    return NextResponse.json({ message: "Invalid upload URL" }, { status: 400 });
  }

  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader) {
    const contentLength = Number.parseInt(contentLengthHeader, 10);
    if (Number.isFinite(contentLength) && contentLength > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { message: "Upload payload exceeds 160 MB limit" },
        { status: 413 }
      );
    }
  }

  const contentType =
    request.headers.get("content-type") ?? "application/octet-stream";
  let bodyBuffer: ArrayBuffer;
  try {
    bodyBuffer = await readRequestBodyWithLimit(request, MAX_UPLOAD_BYTES);
  } catch {
    return NextResponse.json(
      { message: "Upload payload exceeds 160 MB limit" },
      { status: 413 }
    );
  }

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
