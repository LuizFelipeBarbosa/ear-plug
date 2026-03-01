"use client";
import { useCurrentUser } from "@/hooks/useUser";
import { useProfileContext } from "@/hooks/useProfileContext";
import { FanProfileView } from "@/components/fan/ProfileView";
import { BandProfileView } from "@/components/band/BandProfile";
export default function ProfilePage() {
  const { isLoading } = useCurrentUser();
  const { mode, isHydrated } = useProfileContext();
  if (isLoading || !isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">
          <div className="w-12 h-12 bg-fan animate-pulse-fan" />
        </div>
      </div>
    );
  }
  if (mode === "personal") {
    return <FanProfileView />;
  }
  return <BandProfileView />;
}
