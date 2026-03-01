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
export async function uploadToConvexStorage(
  uploadUrl: string,
  file: File,
): Promise<UploadResponseBody> {
  const response = await fetch("/api/convex/storage-upload", {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "x-convex-upload-url": uploadUrl,
    },
    body: file,
  });
  if (!response.ok) {
    throw new Error(`Failed to upload media file (${response.status})`);
  }
  const payload = (await response.json()) as unknown;
  if (!isUploadResponseBody(payload)) {
    throw new Error("Upload failed: storage ID was not returned.");
  }
  return payload;
}
