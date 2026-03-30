import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { AppScreen, LoadingPanel } from "@/components/ui/AppPrimitives";
import { useCurrentUser } from "@/hooks/useUser";

export default function AppEntryScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useCurrentUser();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (user === undefined) return;
    router.replace("/(tabs)");
  }, [isLoaded, isSignedIn, router, user]);

  return (
    <AppScreen>
      <LoadingPanel label="Loading your workspace..." tone="fan" />
    </AppScreen>
  );
}
