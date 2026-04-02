"use client";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { MotionConfig } from "framer-motion";
import { ReactNode, useMemo } from "react";
import { WEB_AUTH_CLERK_APPEARANCE } from "@/components/auth/clerkAppearance";
import { motionConfigTransition } from "@/lib/motion/presets";
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
const clerkSignInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || "/sign-in";
const clerkSignUpUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || "/sign-up";
const clerkSignInFallbackRedirectUrl =
  process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL || "/";
const clerkSignUpFallbackRedirectUrl =
  process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL || "/";
export function Providers({ children }: { children: ReactNode }) {
  const convex = useMemo(() => new ConvexReactClient(convexUrl), []);
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      appearance={WEB_AUTH_CLERK_APPEARANCE}
      signInUrl={clerkSignInUrl}
      signUpUrl={clerkSignUpUrl}
      signInFallbackRedirectUrl={clerkSignInFallbackRedirectUrl}
      signUpFallbackRedirectUrl={clerkSignUpFallbackRedirectUrl}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <MotionConfig reducedMotion="user" transition={motionConfigTransition}>
          {children}
        </MotionConfig>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
