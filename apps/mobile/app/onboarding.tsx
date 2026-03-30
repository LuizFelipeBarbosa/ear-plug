import { useAuth } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { useEffect } from "react";
import { AppScreen, LoadingPanel } from "@/components/ui/AppPrimitives";

export default function OnboardingScreen() {
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    router.replace(isSignedIn ? "/(tabs)" : "/sign-in");
  }, [isLoaded, isSignedIn]);

  return (
    <AppScreen>
      <LoadingPanel label="Refreshing your workspace..." tone="fan" />
    </AppScreen>
  );
}
