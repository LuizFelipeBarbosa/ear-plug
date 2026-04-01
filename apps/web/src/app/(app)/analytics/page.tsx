"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/useUser";
import { useProfileContext } from "@/hooks/useProfileContext";
import { BandAnalyticsView } from "@/components/band/BandAnalyticsView";
export default function AnalyticsPage() {
  const router = useRouter();
  const { isLoading } = useCurrentUser();
  const { mode, isHydrated } = useProfileContext();
  useEffect(() => {
    if (isHydrated && mode === "personal") {
      router.replace("/home");
    }
  }, [isHydrated, mode, router]);
  if (isLoading || !isHydrated || mode === "personal") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 bg-band animate-pulse-band" />
      </div>
    );
  }
  return <BandAnalyticsView />;
}
