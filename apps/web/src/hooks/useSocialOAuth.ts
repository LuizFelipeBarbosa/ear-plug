"use client";

import { useAuth, useSignIn, useUser } from "@clerk/nextjs";
import { usePathname, useSearchParams } from "next/navigation";
import {
  clearPendingSsoIntent,
  getExternalVerificationRedirectUrl,
  getSocialProviderLabel,
  getSocialScopes,
  getSocialStrategy,
  persistPendingSsoIntent,
  resolveSocialOauthReturnTo,
  type SocialProvider,
} from "@/lib/auth/sso";

interface StartSocialOAuthOptions {
  provider: SocialProvider;
  returnTo?: string;
}

export function useSocialOAuth() {
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { isLoaded: isClerkUserLoaded, user } = useUser();
  const { isLoaded: isSignInLoaded, signIn } = useSignIn();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const startSocialOAuth = async ({
    provider,
    returnTo,
  }: StartSocialOAuthOptions): Promise<void> => {
    const resolvedReturnTo =
      returnTo ??
      resolveSocialOauthReturnTo(pathname, searchParams, Boolean(isSignedIn));

    try {
      if (!isAuthLoaded) {
        throw new Error("Authentication is still loading. Try again in a moment.");
      }

      if (isSignedIn) {
        if (!isClerkUserLoaded) {
          throw new Error("Your account is still loading. Try again in a moment.");
        }

        if (!user) {
          throw new Error("Your previous session expired. Sign in again.");
        }

        persistPendingSsoIntent({
          kind: "link_provider",
          provider,
          returnTo: resolvedReturnTo,
        });

        const scopes = getSocialScopes(provider);
        const existingAccount = user.externalAccounts.find(
          (externalAccount) => externalAccount.provider === provider,
        );

        const result = existingAccount
          ? await existingAccount.reauthorize({
              redirectUrl: "/sso-callback",
              ...(scopes ? { additionalScopes: scopes } : {}),
            })
          : await user.createExternalAccount({
              strategy: getSocialStrategy(provider),
              redirectUrl: "/sso-callback",
              ...(scopes ? { additionalScopes: scopes } : {}),
            });

        const redirectUrl =
          getExternalVerificationRedirectUrl(result) ||
          getExternalVerificationRedirectUrl(existingAccount);

        if (!redirectUrl) {
          throw new Error(
            `We couldn't start the ${getSocialProviderLabel(provider)} authorization flow.`,
          );
        }

        window.location.assign(redirectUrl);
        return;
      }

      if (!isSignInLoaded || !signIn) {
        throw new Error("Sign-in is still loading. Try again in a moment.");
      }

      persistPendingSsoIntent({
        kind: "sign_in",
        provider,
        returnTo: resolvedReturnTo,
      });

      await signIn.authenticateWithRedirect({
        strategy: getSocialStrategy(provider),
        redirectUrl: "/sso-callback",
        redirectUrlComplete: resolvedReturnTo,
      });
    } catch (error) {
      clearPendingSsoIntent();
      throw error;
    }
  };

  return {
    startSocialOAuth,
  };
}
