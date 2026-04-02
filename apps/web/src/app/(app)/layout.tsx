"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import {
  composePersonalName,
  hasRequiredFullPersonalName,
  hasRequiredPersonalName,
  hasRequiredProfileLocation,
} from "@ear-plug/shared/utils";
import { NameCompletionModal } from "@/components/auth/NameCompletionModal";
import { BrandMark } from "@/components/branding/BrandLogo";
import { useStaleClerkSessionRecovery } from "@/hooks/useStaleClerkSessionRecovery";
import { useCurrentUser } from "@/hooks/useUser";
import { ProfileContextProvider } from "@/hooks/useProfileContext";
import { BottomNav } from "@/components/navigation/BottomNav";
import { buildAuthRedirectUrl } from "@/lib/auth/sso";
import { isGuestAccessiblePathname } from "@/lib/auth/guestAccess";
import { api } from "../../../../../convex/_generated/api";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoaded: isClerkUserLoaded, user: clerkUser } = useUser();
  const { user, isLoading } = useCurrentUser();
  const { isRecovering } = useStaleClerkSessionRecovery();
  const upsertUser = useMutation(api.users.upsertUser);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const missingClerkName = !hasRequiredPersonalName(
    clerkUser?.firstName,
    clerkUser?.lastName,
  );
  const missingStoredName =
    user !== undefined && user !== null && !hasRequiredFullPersonalName(user.name);
  const missingStoredLocation =
    user !== undefined &&
    user !== null &&
    !hasRequiredProfileLocation(user.location);
  const needsProfileCompletion =
    isSignedIn &&
    Boolean(clerkUser) &&
    (missingClerkName || missingStoredName || missingStoredLocation);
  const isAuthenticatedUserLoading =
    isSignedIn && !needsProfileCompletion && (isLoading || isCreatingUser);
  const isGuestAccessiblePath = isGuestAccessiblePathname(pathname);
  const shouldRedirectGuest =
    isLoaded && !isRecovering && !isSignedIn && !isGuestAccessiblePath;

  // Auto-create user in Convex if authenticated but user doesn't exist
  useEffect(() => {
    async function createUser() {
      if (
        isLoaded &&
        isSignedIn &&
        clerkUser &&
        !isRecovering &&
        !needsProfileCompletion &&
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
    isRecovering,
    isSignedIn,
    clerkUser,
    needsProfileCompletion,
    isLoading,
    user,
    isCreatingUser,
    upsertUser,
  ]);

  useEffect(() => {
    if (!shouldRedirectGuest) {
      return;
    }

    const returnTo = `${pathname}${window.location.search}`;
    const signInUrl = buildAuthRedirectUrl("/sign-in", returnTo);
    router.replace(signInUrl);
  }, [pathname, router, shouldRedirectGuest]);

  if (
    shouldRedirectGuest ||
    isRecovering ||
    !isLoaded ||
    (isSignedIn && !isClerkUserLoaded) ||
    isAuthenticatedUserLoading
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-fan rounded-[24px] border border-border bg-card/90 p-3 shadow-soft">
          <BrandMark className="w-10 sm:w-12" theme="auto" priority />
        </div>
      </div>
    );
  }

  if (needsProfileCompletion) {
    return (
      <div className="min-h-screen bg-background">
        <NameCompletionModal isOpen />
      </div>
    );
  }

  if (isSignedIn && !user) {
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
        {isSignedIn && user ? (
          <>
            <div aria-hidden className="h-16 safe-area-inset-bottom" />
            <BottomNav />
          </>
        ) : null}
      </div>
    </ProfileContextProvider>
  );
}
