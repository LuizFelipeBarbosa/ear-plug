function getStructuredConvexMessage(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("data" in error)) {
    return null;
  }

  const data = (error as { data?: unknown }).data;
  if (!data || typeof data !== "object") {
    return null;
  }

  const message = "message" in data ? (data as { message?: unknown }).message : undefined;
  if (typeof message !== "string") {
    return null;
  }

  const trimmed = message.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isMaskedConvexClientError(message: string): boolean {
  const normalized = message.replace(/\s+/g, " ").trim();
  return (
    normalized.includes("Server Error Called by client") &&
    normalized.startsWith("[CONVEX ")
  );
}

export function getConvexErrorMessage(error: unknown, fallback: string): string {
  const structuredMessage = getStructuredConvexMessage(error);
  if (structuredMessage) {
    return structuredMessage;
  }

  if (error instanceof Error) {
    const message = error.message.trim();
    if (message.length > 0 && !isMaskedConvexClientError(message)) {
      return message;
    }
  }

  return fallback;
}
