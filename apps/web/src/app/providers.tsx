"use client";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
export function Providers({ children }: { children: ReactNode }) {
  const convex = useMemo(() => new ConvexReactClient(convexUrl), []);
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      appearance={{
        variables: {
          colorPrimary: "#2563eb",
          colorTextOnPrimaryBackground: "#ffffff",
          colorBackground: "#ffffff",
          colorText: "#171717",
          colorInputText: "#171717",
          colorInputBackground: "#ffffff",
          colorNeutral: "#e5e5e5",
        },
      }}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
