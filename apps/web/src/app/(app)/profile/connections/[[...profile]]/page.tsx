"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useProfileContext } from "@/hooks/useProfileContext";

export default function SpotifyConnectionsPage() {
  const router = useRouter();
  const { isHydrated, setPersonalMode } = useProfileContext();

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    setPersonalMode();
    router.replace("/profile?tab=settings");
  }, [isHydrated, router, setPersonalMode]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="rounded-[28px] border border-border bg-card/90 px-5 py-4 shadow-soft">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Redirecting to profile settings...
        </div>
      </div>
    </div>
  );
}
