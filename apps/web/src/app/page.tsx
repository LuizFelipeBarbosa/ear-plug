"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  hasRequiredFullPersonalName,
  hasRequiredPersonalName,
} from "@ear-plug/shared/utils";
import { NameCompletionModal } from "@/components/auth/NameCompletionModal";
import { useCurrentUser } from "@/hooks/useUser";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export default function HomePage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoaded: isClerkUserLoaded, user: clerkUser } = useUser();
  const { user, isLoading: isUserLoading } = useCurrentUser();
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

  useEffect(() => {
    if (
      isLoaded &&
      isClerkUserLoaded &&
      isSignedIn &&
      !isUserLoading &&
      !needsNameCompletion
    ) {
      router.push("/home");
    }
  }, [
    isClerkUserLoaded,
    isLoaded,
    isSignedIn,
    isUserLoading,
    needsNameCompletion,
    router,
  ]);

  if (!isLoaded || (isSignedIn && (!isClerkUserLoaded || isUserLoading))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-fan animate-pulse-fan" />
        </div>
      </div>
    );
  }

  return (
    <OnboardingFlow
      overlay={needsNameCompletion ? <NameCompletionModal isOpen /> : undefined}
    />
  );
}
