import { useEffect, useMemo, useRef, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ClerkLoaded, ClerkProvider, useAuth, useUser } from "@clerk/clerk-expo";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { useMutation, useQuery } from "convex/react";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView, Text, View } from "react-native";
import { api } from "../../../convex/_generated/api";
import { MobileProfileContextProvider } from "@/context/ProfileContext";
import { onboardingStorageKey } from "@/constants/storage";
import { getEnv, getMissingRequiredEnv } from "@/lib/env";
import "../global.css";

const missingEnv = getMissingRequiredEnv();
const convex = missingEnv.includes("EXPO_PUBLIC_CONVEX_URL")
  ? null
  : new ConvexReactClient(getEnv("EXPO_PUBLIC_CONVEX_URL"));

const tokenCache = {
  async getToken(key: string) {
    try {
      return SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch {
      return;
    }
  },
};

function EnvErrorScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 p-6 justify-center">
        <Text className="text-2xl font-bold text-gray-900">Mobile Env Misconfigured</Text>
        <Text className="mt-3 text-gray-600">
          Add missing variables to `apps/mobile/.env.local` and restart Expo.
        </Text>

        {missingEnv.map((key) => (
          <View key={key} className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
            <Text className="font-mono text-sm text-red-700">{key}</Text>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

function UserBootstrap({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const convexUser = useQuery(api.users.getCurrentUser);
  const upsertUser = useMutation(api.users.upsertUser);
  const attemptedFor = useRef<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !clerkUser) return;
    if (convexUser === undefined) return;

    if (convexUser === null && attemptedFor.current !== clerkUser.id) {
      attemptedFor.current = clerkUser.id;
      setIsBootstrapping(true);

      void upsertUser({
        clerkId: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || "",
        phoneNumber: clerkUser.primaryPhoneNumber?.phoneNumber,
        name: clerkUser.fullName || clerkUser.firstName || "User",
        avatar: clerkUser.imageUrl,
      })
        .catch((error) => {
          attemptedFor.current = null;
          console.error("Failed to bootstrap user", error);
        })
        .finally(() => {
          setIsBootstrapping(false);
        });
    }
  }, [clerkUser, convexUser, isLoaded, isSignedIn, upsertUser]);

  if (isBootstrapping) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <Text className="text-sm text-gray-600">Syncing account...</Text>
      </SafeAreaView>
    );
  }

  return <>{children}</>;
}

function NavigationGuard() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigatingRef = useRef(false);
  const [onboardingHydrated, setOnboardingHydrated] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  const firstSegment = segments[0];

  const isPublicRoute = useMemo(() => {
    return firstSegment === "sign-in" || firstSegment === "sign-up";
  }, [firstSegment]);

  const isOnboardingRoute = firstSegment === "onboarding";

  useEffect(() => {
    let active = true;

    async function hydrateOnboardingStatus() {
      if (!isLoaded) return;

      if (!isSignedIn || !userId) {
        if (active) {
          setOnboardingHydrated(true);
          setOnboardingComplete(false);
        }
        return;
      }

      try {
        const value = await AsyncStorage.getItem(onboardingStorageKey(userId));
        if (!active) return;
        setOnboardingComplete(value === "true");
      } catch {
        if (!active) return;
        setOnboardingComplete(false);
      } finally {
        if (active) {
          setOnboardingHydrated(true);
        }
      }
    }

    setOnboardingHydrated(false);
    void hydrateOnboardingStatus();

    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn, userId]);

  useEffect(() => {
    if (!isLoaded || navigatingRef.current) return;

    if (!isSignedIn && !isPublicRoute) {
      navigatingRef.current = true;
      router.replace("/sign-in");
      setTimeout(() => {
        navigatingRef.current = false;
      }, 50);
      return;
    }

    if (isSignedIn && !isPublicRoute) {
      if (!onboardingHydrated) return;

      if (!onboardingComplete && !isOnboardingRoute) {
        navigatingRef.current = true;
        router.replace("/onboarding");
        setTimeout(() => {
          navigatingRef.current = false;
        }, 50);
        return;
      }

      if (onboardingComplete && isOnboardingRoute) {
        navigatingRef.current = true;
        router.replace("/(tabs)");
        setTimeout(() => {
          navigatingRef.current = false;
        }, 50);
        return;
      }
    }

    if (isSignedIn && isPublicRoute) {
      navigatingRef.current = true;
      router.replace("/");
      setTimeout(() => {
        navigatingRef.current = false;
      }, 50);
    }
  }, [
    isLoaded,
    isOnboardingRoute,
    isPublicRoute,
    isSignedIn,
    onboardingComplete,
    onboardingHydrated,
    router,
  ]);

  return null;
}

function RootNavigator() {
  return (
    <>
      <NavigationGuard />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#ffffff" },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="sign-up" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="gig/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="gig/[id]/ticket" options={{ headerShown: false }} />
        <Stack.Screen name="gig/[id]/check-in" options={{ headerShown: false }} />
        <Stack.Screen name="bands/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="fans/[id]" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

export default function RootLayout() {
  if (missingEnv.length > 0 || !convex) {
    return <EnvErrorScreen />;
  }

  return (
    <ClerkProvider
      publishableKey={getEnv("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY")}
      tokenCache={tokenCache}
    >
      <ClerkLoaded>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <MobileProfileContextProvider>
            <UserBootstrap>
              <RootNavigator />
            </UserBootstrap>
          </MobileProfileContextProvider>
        </ConvexProviderWithClerk>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
