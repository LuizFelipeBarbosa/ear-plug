"use client";

import { useCurrentUser } from "@/hooks/useUser";
import { FanProfileView } from "@/components/fan/ProfileView";
import { BandProfileView } from "@/components/band/BandProfile";

export default function ProfilePage() {
  const { isFan, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-12 h-12 rounded-full bg-primary-500" />
        </div>
      </div>
    );
  }

  if (isFan) {
    return <FanProfileView />;
  }

  return <BandProfileView />;
}
