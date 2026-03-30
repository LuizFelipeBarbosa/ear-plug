"use client";

interface UploadResponseBody {
  storageId: string;
}

function isUploadResponseBody(value: unknown): value is UploadResponseBody {
  if (!value || typeof value !== "object") {
    return false;
  }
  if (!("storageId" in value)) {
    return false;
  }
  return typeof (value as { storageId?: unknown }).storageId === "string";
}

async function getUploadErrorMessage(response: Response): Promise<string | null> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await response.json().catch(() => null)) as
      | { message?: unknown; error?: unknown }
      | null;

    if (typeof payload?.message === "string" && payload.message.length > 0) {
      return payload.message;
    }

    if (typeof payload?.error === "string" && payload.error.length > 0) {
      return payload.error;
    }

    return null;
  }

  const text = await response.text().catch(() => "");
  return text.trim() || null;
}

async function uploadFile(
  requestUrl: string,
  file: File,
  headers?: HeadersInit,
): Promise<UploadResponseBody> {
  const response = await fetch(requestUrl, {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      ...headers,
    },
    body: file,
  });

  if (!response.ok) {
    const message = await getUploadErrorMessage(response);
    throw new Error(message ?? `Failed to upload media file (${response.status})`);
  }

  const payload = (await response.json()) as unknown;
  if (!isUploadResponseBody(payload)) {
    throw new Error("Upload failed: storage ID was not returned.");
  }

  return payload;
}

async function uploadFileViaProxy(
  uploadUrl: string,
  file: File,
): Promise<UploadResponseBody> {
  return await uploadFile("/api/convex/storage-upload", file, {
    "x-convex-upload-url": uploadUrl,
  });
}

export async function uploadToConvexStorage(
  uploadUrl: string,
  file: File,
): Promise<UploadResponseBody> {
  try {
    return await uploadFile(uploadUrl, file);
  } catch (error) {
    // Fall back to the server-side relay if the browser cannot reach Convex
    // directly because of a network, CORS, or CSP failure.
    if (!(error instanceof TypeError)) {
      throw error;
    }
  }

  return await uploadFileViaProxy(uploadUrl, file);
}
