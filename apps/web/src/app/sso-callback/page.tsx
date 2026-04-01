"use client";

import { useEffect, useRef, useState } from "react";
import { AuthenticateWithRedirectCallback, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  clearPendingSsoIntent,
  readPendingSsoIntent,
  type PendingSsoIntent,
} from "@/lib/auth/sso";

export default function SSOCallbackPage() {
  const router = useRouter();
  const { isLoaded, user } = useUser();
  const [intent, setIntent] = useState<PendingSsoIntent | null | undefined>(undefined);
  const didReadIntentRef = useRef(false);
  const hasHandledLinkIntentRef = useRef(false);
  const hasClearedSignInIntentRef = useRef(false);

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
    if (
      intent?.kind !== "link_provider" ||
      hasHandledLinkIntentRef.current ||
      !isLoaded
    ) {
      return;
    }

    hasHandledLinkIntentRef.current = true;

    void (async () => {
      try {
        await user?.reload();
      } finally {
        clearPendingSsoIntent();
        router.replace(intent.returnTo);
      }
    })();
  }, [intent, isLoaded, router, user]);

  if (intent === undefined || intent === null) {
    return <CallbackLoader copy="Preparing sign-in..." />;
  }

  if (intent.kind === "sign_in") {
    if (!hasClearedSignInIntentRef.current) {
      clearPendingSsoIntent();
      hasClearedSignInIntentRef.current = true;
    }

    return (
      <>
        <AuthenticateWithRedirectCallback />
        <div id="clerk-captcha" />
      </>
    );
  }

  return <CallbackLoader copy={`Finishing ${intent.provider} connection...`} />;
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
    </div>
  );
}
