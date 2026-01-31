"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useCurrentUser } from "@/hooks/useUser";
import { BottomNav } from "@/components/navigation/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { user, isLoading } = useCurrentUser();

  useEffect(() => {
    // Redirect to onboarding if not authenticated
    if (isLoaded && !isSignedIn) {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, router]);

  // Show loading state
  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-night">
        <div className="animate-pulse">
          <div className="w-12 h-12 bg-lime animate-pulse-lime" />
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isSignedIn || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-night pb-20">
      {children}
      <BottomNav />
    </div>
  );
}
