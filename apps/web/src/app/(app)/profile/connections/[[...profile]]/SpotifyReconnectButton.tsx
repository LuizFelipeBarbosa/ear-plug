"use client";

import { useState } from "react";
import { useSignIn } from "@clerk/nextjs";
import { RefreshCw } from "lucide-react";

function getClerkActionErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "errors" in error &&
    Array.isArray((error as { errors?: Array<{ message?: unknown }> }).errors)
  ) {
    const message = (error as { errors?: Array<{ message?: unknown }> }).errors?.find(
      (entry) => typeof entry.message === "string" && entry.message.length > 0,
    )?.message;

    if (typeof message === "string") {
      return message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "We couldn't start the Spotify reconnect flow.";
}

export function SpotifyReconnectButton() {
  const { isLoaded, signIn } = useSignIn();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReconnect = async () => {
    if (!isLoaded || !signIn) {
      return;
    }

    setError(null);
    setIsRedirecting(true);

    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_spotify",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/profile/connections",
      });
    } catch (caughtError) {
      setError(getClerkActionErrorMessage(caughtError));
      setIsRedirecting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-fan/15 bg-fan/5 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Spotify token missing?
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Run a fresh Clerk Spotify consent flow here. This is the reconnect
            path when the embedded profile UI does not expose a disconnect
            control.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleReconnect()}
          disabled={!isLoaded || !signIn || isRedirecting}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-fan px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-fan/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <RefreshCw className="h-4 w-4" />
          {isRedirecting ? "Redirecting..." : "Reconnect Spotify"}
        </button>
      </div>

      {error ? (
        <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      ) : null}
    </div>
  );
}
