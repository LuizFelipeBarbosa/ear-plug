"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useCurrentUser } from "@/hooks/useUser";
import { useRolePersistence } from "@/hooks/useLocalStorage";
import { BottomNav } from "@/components/navigation/BottomNav";
import { api } from "../../../../../convex/_generated/api";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const { user, isLoading } = useCurrentUser();
  const { role: persistedRole } = useRolePersistence();
  const upsertUser = useMutation(api.users.upsertUser);
  const updateRole = useMutation(api.users.updateRole);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

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
            name: clerkUser.fullName || clerkUser.firstName || "User",
            avatar: clerkUser.imageUrl,
          });

          // Update role if persisted from onboarding
          if (persistedRole) {
            await updateRole({ role: persistedRole });
          }
        } catch (error) {
          console.error("Failed to create user:", error);
        } finally {
          // Reset flag so the real-time query can take over
          setIsCreatingUser(false);
        }
      }
    }

    createUser();
  }, [isLoaded, isSignedIn, clerkUser, isLoading, user, isCreatingUser, persistedRole, upsertUser, updateRole]);

  // Show loading state while auth loads, Convex loads, or user is being created
  if (!isLoaded || isLoading || isCreatingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-night">
        <div className="animate-pulse">
          <div className="w-12 h-12 bg-lime animate-pulse-lime" />
        </div>
      </div>
    );
  }

  // Redirect to landing if not authenticated
  if (!isSignedIn) {
    return null;
  }

  // Still waiting for user to be created (query hasn't returned yet)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-night">
        <div className="animate-pulse">
          <div className="w-12 h-12 bg-lime animate-pulse-lime" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-night">
      {children}
      <BottomNav />
    </div>
  );
}
