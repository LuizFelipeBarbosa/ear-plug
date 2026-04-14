"use client";

import { useEffect, useRef, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  clearPendingSsoIntent,
  normalizeReturnTo,
  readPendingSsoIntent,
  type PendingSsoIntent,
} from "@/lib/auth/sso";

export default function SSOCallbackPage() {
  const clerk = useClerk();
  const router = useRouter();
  const { user } = useUser();
  const [intent, setIntent] = useState<PendingSsoIntent | null | undefined>(undefined);
  const didReadIntentRef = useRef(false);
  const didHandleCallbackRef = useRef(false);

  useEffect(() => {
    if (didReadIntentRef.current) {
      return;
    }

    didReadIntentRef.current = true;
    setIntent(readPendingSsoIntent());
  }, []);

  useEffect(() => {
    if (intent === undefined || didHandleCallbackRef.current) {
      return;
    }

    didHandleCallbackRef.current = true;
    const fallbackDestination = intent ? normalizeReturnTo(intent.returnTo) : "/";
    const callbackOptions = intent
      ? {
          signInUrl: "/sign-in",
          signUpUrl: "/sign-up",
          signInForceRedirectUrl: fallbackDestination,
          signUpForceRedirectUrl: fallbackDestination,
          signInFallbackRedirectUrl: fallbackDestination,
          signUpFallbackRedirectUrl: fallbackDestination,
        }
      : {
          signInUrl: "/sign-in",
          signUpUrl: "/sign-up",
        };

    void clerk
      .handleRedirectCallback(
        callbackOptions,
        async (to) => {
          if (intent?.kind === "link_provider") {
            await user?.reload();
          }

          clearPendingSsoIntent();
          router.replace(
            resolveSameOriginDestination(
              to || fallbackDestination || "/",
              fallbackDestination,
            ),
          );
        },
      )
      .catch(() => {
        clearPendingSsoIntent();
        router.replace("/sign-in");
      });
  }, [clerk, intent, router, user]);

  return <CallbackLoader copy={getCallbackCopy(intent)} />;
}

function getCallbackCopy(intent: PendingSsoIntent | null | undefined): string {
  if (!intent) {
    return "Preparing sign-in...";
  }

  if (intent.kind === "link_provider") {
    return `Finishing ${intent.provider} connection...`;
  }

  return `Finishing ${intent.provider} sign-in...`;
}

function CallbackLoader({ copy }: { copy: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="rounded-[28px] border border-border bg-card/90 px-5 py-4 shadow-soft">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {copy}
        </div>
      </div>
      <div id="clerk-captcha" />
    </div>
  );
}

function resolveSameOriginDestination(
  destination: string,
  fallback: string,
): string {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const parsedDestination = new URL(destination, window.location.origin);
    if (parsedDestination.origin !== window.location.origin) {
      return fallback;
    }

    return normalizeReturnTo(
      `${parsedDestination.pathname}${parsedDestination.search}${parsedDestination.hash}`,
      fallback,
    );
  } catch {
    return fallback;
  }
}
