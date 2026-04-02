import { useEffect, useMemo, useRef, useState } from "react";
import { Stack, useRootNavigationState, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ClerkLoaded, ClerkProvider, useAuth, useUser } from "@clerk/clerk-expo";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { useMutation, useQuery } from "convex/react";
import {
  composePersonalName,
  hasRequiredFullPersonalName,
  hasRequiredPersonalName,
  hasRequiredProfileLocation,
} from "@ear-plug/shared/utils";
import * as SecureStore from "expo-secure-store";
import { Text } from "react-native";
import { api } from "../../../convex/_generated/api";
import { NameCompletionModal } from "@/components/auth/NameCompletionModal";
import { AppScreen, HeroHeader, LoadingPanel, SectionCard } from "@/components/ui/AppPrimitives";
import { MobileProfileContextProvider } from "@/context/ProfileContext";
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
    <AppScreen
      scroll
      header={
        <HeroHeader
          title="Mobile Env Misconfigured"
          subtitle="Add the missing Expo public variables to `apps/mobile/.env.local` and restart Expo."
          eyebrow="Runtime Setup"
          tone="danger"
        />
      }
    >
      <SectionCard tone="danger">
        {missingEnv.map((key) => (
          <SectionCard key={key} tone="danger">
            <Text className="font-mono text-sm text-red-700">{key}</Text>
          </SectionCard>
        ))}
      </SectionCard>
    </AppScreen>
  );
}

function UserBootstrap({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoaded: isClerkUserLoaded, user: clerkUser } = useUser();
  const convexUser = useQuery(api.users.getCurrentUser);
  const upsertUser = useMutation(api.users.upsertUser);
  const attemptedFor = useRef<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const missingClerkName = !hasRequiredPersonalName(
    clerkUser?.firstName,
    clerkUser?.lastName,
  );
  const missingStoredName =
    convexUser !== undefined &&
    convexUser !== null &&
    !hasRequiredFullPersonalName(convexUser.name);
  const missingStoredLocation =
    convexUser !== undefined &&
    convexUser !== null &&
    !hasRequiredProfileLocation(convexUser.location);
  const needsProfileCompletion =
    isLoaded &&
    isSignedIn &&
    Boolean(clerkUser) &&
    (missingClerkName || missingStoredName || missingStoredLocation);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !clerkUser) return;
    if (convexUser === undefined) return;
    if (needsProfileCompletion) return;

    if (convexUser === null && attemptedFor.current !== clerkUser.id) {
      attemptedFor.current = clerkUser.id;
      setIsBootstrapping(true);

      void upsertUser({
        clerkId: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || "",
        phoneNumber: clerkUser.primaryPhoneNumber?.phoneNumber,
        name: composePersonalName(clerkUser.firstName, clerkUser.lastName),
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
  }, [clerkUser, convexUser, isLoaded, isSignedIn, needsProfileCompletion, upsertUser]);

  if ((isSignedIn && !isClerkUserLoaded) || isBootstrapping) {
    return (
      <AppScreen>
        <LoadingPanel label="Syncing account..." tone="fan" />
      </AppScreen>
    );
  }

  if (needsProfileCompletion) {
    return (
      <>
        <AppScreen>
          <LoadingPanel label="Complete your profile to continue..." tone="fan" />
        </AppScreen>
        <NameCompletionModal visible />
      </>
    );
  }

  return <>{children}</>;
}

function NavigationGuard() {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const navigatingRef = useRef(false);

  const firstSegment = segments[0];

  const isPublicRoute = useMemo(() => {
    return firstSegment === "sign-in" || firstSegment === "sign-up" || firstSegment === "sso-callback";
  }, [firstSegment]);

  useEffect(() => {
    if (!isLoaded || !rootNavigationState?.key || navigatingRef.current) return;

    if (!isSignedIn && !isPublicRoute) {
      navigatingRef.current = true;
      router.replace("/sign-in");
      setTimeout(() => {
        navigatingRef.current = false;
      }, 50);
      return;
    }

    if (isSignedIn && isPublicRoute) {
      navigatingRef.current = true;
      router.replace("/(tabs)");
      setTimeout(() => {
        navigatingRef.current = false;
      }, 50);
    }
  }, [
    isLoaded,
    isPublicRoute,
    isSignedIn,
    rootNavigationState?.key,
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
          contentStyle: { backgroundColor: "#f8fafc" },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="sign-up" options={{ headerShown: false }} />
        <Stack.Screen name="sso-callback" options={{ headerShown: false }} />
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
