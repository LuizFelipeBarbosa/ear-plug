import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { AppScreen, LoadingPanel } from "@/components/ui/AppPrimitives";

export default function AppEntryScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    router.replace("/(tabs)");
  }, [isLoaded, isSignedIn, router]);

  return (
    <AppScreen>
      <LoadingPanel label="Loading your workspace..." tone="fan" />
    </AppScreen>
  );
}
