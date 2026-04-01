"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  hasRequiredFullPersonalName,
  hasRequiredPersonalName,
} from "@ear-plug/shared/utils";
import { NameCompletionModal } from "@/components/auth/NameCompletionModal";
import { BrandMark } from "@/components/branding/BrandLogo";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { useCurrentUser } from "@/hooks/useUser";
import { useStaleClerkSessionRecovery } from "@/hooks/useStaleClerkSessionRecovery";

interface AuthExperienceProps {
  redirectAuthenticatedToHome?: boolean;
  showAuthPanelWhenSignedIn?: boolean;
}

export function AuthExperience({
  redirectAuthenticatedToHome = false,
  showAuthPanelWhenSignedIn = false,
}: AuthExperienceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoaded: isClerkUserLoaded, user: clerkUser } = useUser();
  const { user, isLoading: isUserLoading } = useCurrentUser();
  const { isRecovering } = useStaleClerkSessionRecovery();

  const missingClerkName = !hasRequiredPersonalName(
    clerkUser?.firstName,
    clerkUser?.lastName,
  );
  const missingStoredName =
    user !== undefined && user !== null && !hasRequiredFullPersonalName(user.name);
  const needsNameCompletion =
    isSignedIn &&
    Boolean(clerkUser) &&
    (missingClerkName || missingStoredName);
  const authNotice =
    searchParams.get("notice") === "session-expired"
      ? "Your previous session expired. Sign in again."
      : null;

  useEffect(() => {
    if (
      !redirectAuthenticatedToHome ||
      isRecovering ||
      !isLoaded ||
      !isClerkUserLoaded ||
      !isSignedIn ||
      !clerkUser ||
      isUserLoading ||
      needsNameCompletion
    ) {
      return;
    }

    router.replace("/home");
  }, [
    clerkUser,
    isClerkUserLoaded,
    isLoaded,
    isRecovering,
    isSignedIn,
    isUserLoading,
    needsNameCompletion,
    redirectAuthenticatedToHome,
    router,
  ]);

  if (isRecovering || !isLoaded || (isSignedIn && (!isClerkUserLoaded || isUserLoading))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-fan rounded-[28px] border border-border bg-card/90 p-4 shadow-soft">
          <BrandMark className="w-14 sm:w-16" theme="auto" priority />
        </div>
      </div>
    );
  }

  return (
    <OnboardingFlow
      authNotice={authNotice}
      showAuthPanelWhenSignedIn={showAuthPanelWhenSignedIn}
      overlay={needsNameCompletion ? <NameCompletionModal isOpen /> : undefined}
    />
  );
}
