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

export async function uploadUriToConvexStorage(uploadUrl: string, uri: string): Promise<ConvexStorageUploadResponse> {
  const fileResponse = await fetch(uri);
  const blob = await fileResponse.blob();

  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": blob.type || "application/octet-stream",
    },
    body: blob,
  });

  if (!uploadResponse.ok) {
    throw new Error(`Upload failed (${uploadResponse.status})`);
  }

  const payload = (await uploadResponse.json()) as unknown;
  if (!isUploadResponse(payload)) {
    throw new Error("Upload failed: storage ID was not returned.");
  }

  return payload;
}
