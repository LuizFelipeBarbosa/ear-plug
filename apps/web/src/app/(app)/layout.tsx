"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import {
  composePersonalName,
  hasRequiredFullPersonalName,
  hasRequiredPersonalName,
} from "@ear-plug/shared/utils";
import { NameCompletionModal } from "@/components/auth/NameCompletionModal";
import { BrandMark } from "@/components/branding/BrandLogo";
import { useCurrentUser } from "@/hooks/useUser";
import { ProfileContextProvider } from "@/hooks/useProfileContext";
import { BottomNav } from "@/components/navigation/BottomNav";
import { api } from "../../../../../convex/_generated/api";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoaded: isClerkUserLoaded, user: clerkUser } = useUser();
  const { user, isLoading } = useCurrentUser();
  const upsertUser = useMutation(api.users.upsertUser);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
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
    // Redirect to onboarding if not authenticated
    if (isLoaded && !isSignedIn) {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, router]);

  // Auto-create user in Convex if authenticated but user doesn't exist
  useEffect(() => {
    async function createUser() {
      if (
        isLoaded &&
        isSignedIn &&
        clerkUser &&
        !needsNameCompletion &&
        !isLoading &&
        user === null &&
        !isCreatingUser
      ) {
        setIsCreatingUser(true);
        try {
          // Create user in Convex
          await upsertUser({
            clerkId: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress || "",
            phoneNumber: clerkUser.primaryPhoneNumber?.phoneNumber,
            name: composePersonalName(
              clerkUser.firstName,
              clerkUser.lastName,
            ),
            avatar: clerkUser.imageUrl,
          });
        } catch (error) {
          console.error("Failed to create user:", error);
        } finally {
          // Reset flag so the real-time query can take over
          setIsCreatingUser(false);
        }
      }
    }

    createUser();
  }, [
    isLoaded,
    isSignedIn,
    clerkUser,
    needsNameCompletion,
    isLoading,
    user,
    isCreatingUser,
    upsertUser,
  ]);

  if (
    !isLoaded ||
    (isSignedIn && !isClerkUserLoaded) ||
    (!needsNameCompletion && (isLoading || isCreatingUser))
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-fan rounded-[24px] border border-border bg-card/90 p-3 shadow-soft">
          <BrandMark className="w-10 sm:w-12" theme="auto" priority />
        </div>
      </div>
    );
  }

  // Redirect to landing if not authenticated
  if (!isSignedIn) {
    return null;
  }

  if (needsNameCompletion) {
    return (
      <div className="min-h-screen bg-background">
        <NameCompletionModal isOpen />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-fan rounded-[24px] border border-border bg-card/90 p-3 shadow-soft">
          <BrandMark className="w-10 sm:w-12" theme="auto" priority />
        </div>
      </div>
    );
  }

  return (
    <ProfileContextProvider>
      <div className="min-h-screen bg-background">
        {children}
        {/* Reserve vertical space for fixed bottom navigation */}
        <div aria-hidden className="h-16 safe-area-inset-bottom" />
        <BottomNav />
      </div>
    </ProfileContextProvider>
  );
}
