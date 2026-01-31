"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";

// Initialize Convex client
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;

export function Providers({ children }: { children: ReactNode }) {
  const convex = useMemo(() => new ConvexReactClient(convexUrl), []);

  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      appearance={{
        variables: {
          colorPrimary: "#C2FF00", // Electric Lime
          colorTextOnPrimaryBackground: "#0F0F0F", // Night
          colorBackground: "#0F0F0F",
          colorText: "#FFFFFF",
        },
      }}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
