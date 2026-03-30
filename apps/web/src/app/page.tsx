"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { hasRequiredPersonalName } from "@ear-plug/shared/utils";
import { NameCompletionModal } from "@/components/auth/NameCompletionModal";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export default function HomePage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoaded: isClerkUserLoaded, user: clerkUser } = useUser();
  const needsNameCompletion =
    isSignedIn &&
    Boolean(clerkUser) &&
    !hasRequiredPersonalName(clerkUser?.firstName, clerkUser?.lastName);

  useEffect(() => {
    if (isLoaded && isClerkUserLoaded && isSignedIn && !needsNameCompletion) {
      router.push("/home");
    }
  }, [isClerkUserLoaded, isLoaded, isSignedIn, needsNameCompletion, router]);

  if (!isLoaded || (isSignedIn && !isClerkUserLoaded)) {
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
