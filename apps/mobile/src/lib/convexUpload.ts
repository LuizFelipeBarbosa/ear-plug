export interface ConvexStorageUploadResponse {
  storageId: string;
}

function isUploadResponse(value: unknown): value is ConvexStorageUploadResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    "storageId" in value &&
    typeof (value as { storageId?: unknown }).storageId === "string"
  );
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

export async function uploadUriToConvexStorage(
  uploadUrl: string,
  uri: string,
  contentType?: string,
): Promise<ConvexStorageUploadResponse> {
  const fileResponse = await fetch(uri);
  const blob = await fileResponse.blob();

  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": contentType || blob.type || "application/octet-stream",
    },
    body: blob,
  });

  if (!uploadResponse.ok) {
    const message = await getUploadErrorMessage(uploadResponse);
    throw new Error(message ?? `Upload failed (${uploadResponse.status})`);
  }

  const payload = (await uploadResponse.json()) as unknown;
  if (!isUploadResponse(payload)) {
    throw new Error("Upload failed: storage ID was not returned.");
  }

  return payload;
}
