import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, Text, View } from "react-native";
import { onboardingStorageKey } from "@/constants/storage";
import { useCurrentUser } from "@/hooks/useUser";

export default function AppEntryScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useCurrentUser();
  const [hydratedOnboarding, setHydratedOnboarding] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  useEffect(() => {
    let active = true;

    async function hydrate() {
      if (!isSignedIn || !userId) {
        if (active) {
          setOnboardingComplete(false);
          setHydratedOnboarding(true);
        }
        return;
      }

      try {
        const raw = await AsyncStorage.getItem(onboardingStorageKey(userId));
        if (!active) return;
        setOnboardingComplete(raw === "true");
      } catch {
        if (!active) return;
        setOnboardingComplete(false);
      } finally {
        if (active) {
          setHydratedOnboarding(true);
        }
      }
    }

    setHydratedOnboarding(false);
    void hydrate();

    return () => {
      active = false;
    };
  }, [isSignedIn, userId]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !hydratedOnboarding) return;
    if (user === undefined) return;

    if (!onboardingComplete) {
      router.replace("/onboarding");
      return;
    }

    router.replace("/(tabs)");
  }, [hydratedOnboarding, isLoaded, isSignedIn, onboardingComplete, router, user]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-6">
        <ActivityIndicator size="small" color="#2563eb" />
        <Text className="mt-3 text-sm text-gray-600">Loading your workspace...</Text>
      </View>
    </SafeAreaView>
  );
}
