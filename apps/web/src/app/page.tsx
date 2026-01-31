"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useCurrentUser } from "@/hooks/useUser";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export default function HomePage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { user, isLoading } = useCurrentUser();

  useEffect(() => {
    // If user is authenticated and has completed onboarding, redirect to home
    if (isLoaded && isSignedIn && user && !isLoading) {
      router.push("/home");
    }
  }, [isLoaded, isSignedIn, user, isLoading, router]);

  // Show loading state while checking auth
  if (!isLoaded || (isSignedIn && isLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-night">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-lime animate-pulse-lime" />
        </div>
      </div>
    );
  }

  // Show onboarding for new or unauthenticated users
  return <OnboardingFlow />;
}
