"use client";

import { useEffect, useRef, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  clearPendingSsoIntent,
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
    if (intent !== null) {
      return;
    }

    router.replace("/sign-in");
  }, [intent, router]);

  useEffect(() => {
    if (!intent || didHandleCallbackRef.current) {
      return;
    }

    didHandleCallbackRef.current = true;

    void clerk
      .handleRedirectCallback(
        {
          signInUrl: "/sign-in",
          signUpUrl: "/sign-up",
          signInForceRedirectUrl: intent.returnTo,
          signUpForceRedirectUrl: intent.returnTo,
          signInFallbackRedirectUrl: intent.returnTo,
          signUpFallbackRedirectUrl: intent.returnTo,
        },
        async (to) => {
          if (intent.kind === "link_provider") {
            await user?.reload();
          }

          clearPendingSsoIntent();

          if (to.startsWith("http://") || to.startsWith("https://")) {
            window.location.assign(to);
            return;
          }

          router.replace(to);
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
