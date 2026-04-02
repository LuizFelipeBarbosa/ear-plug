"use client";

export type SocialProvider = "google" | "spotify";
export type PendingSsoIntentKind = "sign_in" | "link_provider";

export interface PendingSsoIntent {
  kind: PendingSsoIntentKind;
  provider: SocialProvider;
  returnTo: string;
  createdAt: number;
}

type SearchParamsLike = Pick<URLSearchParams, "get" | "toString"> | null | undefined;

const PENDING_SSO_INTENT_KEY = "earplug.pending_sso_intent";
const PENDING_SSO_MAX_AGE_MS = 10 * 60 * 1000;
const SPOTIFY_SCOPES = ["user-top-read", "user-follow-read"] as const;
const DEFAULT_AUTH_RETURN_TO = "/home";

export function getSocialProviderLabel(provider: SocialProvider): string {
  return provider === "google" ? "Google" : "Spotify";
}

export function getSocialStrategy(
  provider: SocialProvider,
): "oauth_google" | "oauth_spotify" {
  return `oauth_${provider}`;
}

export function getSocialScopes(provider: SocialProvider): string[] | undefined {
  return provider === "spotify" ? [...SPOTIFY_SCOPES] : undefined;
}

export function normalizeClerkExternalAccountProvider(
  provider: string,
): SocialProvider | null {
  if (provider === "google" || provider === "oauth_google") {
    return "google";
  }

  if (provider === "spotify" || provider === "oauth_spotify") {
    return "spotify";
  }

  return null;
}

export function isMatchingClerkExternalAccountProvider(
  clerkProvider: string,
  provider: SocialProvider,
): boolean {
  return normalizeClerkExternalAccountProvider(clerkProvider) === provider;
}

export function getCurrentPathWithSearch(
  pathname: string,
  searchParams: SearchParamsLike,
): string {
  const normalizedPathname = pathname || "/";
  const query = searchParams?.toString();

  return query ? `${normalizedPathname}?${query}` : normalizedPathname;
}

function isAuthInterstitialPath(pathname: string): boolean {
  return (
    pathname === "/sso-callback" ||
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up")
  );
}

export function normalizeReturnTo(
  value: string | null | undefined,
  fallback = DEFAULT_AUTH_RETURN_TO,
): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }

  return isAuthInterstitialPath(trimmed) ? fallback : trimmed;
}

export function resolveAuthReturnTo(
  searchParams: SearchParamsLike,
  fallback = DEFAULT_AUTH_RETURN_TO,
): string {
  return normalizeReturnTo(searchParams?.get("returnTo"), fallback);
}

export function buildAuthRedirectUrl(pathname: string, returnTo: string): string {
  const params = new URLSearchParams();
  params.set("returnTo", normalizeReturnTo(returnTo));
  return `${pathname}?${params.toString()}`;
}

export function resolveSocialOauthReturnTo(
  pathname: string,
  searchParams: SearchParamsLike,
  isSignedIn: boolean,
): string {
  const currentPath = normalizeReturnTo(
    getCurrentPathWithSearch(pathname, searchParams),
  );
  const authReturnTo = resolveAuthReturnTo(searchParams);

  if (isSignedIn) {
    return pathname === "/sso-callback" ? authReturnTo : currentPath;
  }

  if (isAuthInterstitialPath(pathname)) {
    return authReturnTo;
  }

  return currentPath;
}

export function persistPendingSsoIntent(
  intent: Omit<PendingSsoIntent, "createdAt">,
): void {
  if (typeof window === "undefined") {
    return;
  }

  const payload: PendingSsoIntent = {
    ...intent,
    createdAt: Date.now(),
  };

  window.sessionStorage.setItem(PENDING_SSO_INTENT_KEY, JSON.stringify(payload));
}

export function readPendingSsoIntent(): PendingSsoIntent | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(PENDING_SSO_INTENT_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue);

    if (!isPendingSsoIntent(parsed)) {
      clearPendingSsoIntent();
      return null;
    }

    if (Date.now() - parsed.createdAt > PENDING_SSO_MAX_AGE_MS) {
      clearPendingSsoIntent();
      return null;
    }

    return parsed;
  } catch {
    clearPendingSsoIntent();
    return null;
  }
}

export function clearPendingSsoIntent(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(PENDING_SSO_INTENT_KEY);
}

export function getExternalVerificationRedirectUrl(resource: unknown): string | null {
  if (typeof resource !== "object" || resource === null) {
    return null;
  }

  const verification = (
    resource as {
      verification?: { externalVerificationRedirectURL?: unknown } | null;
    }
  ).verification;

  if (
    verification &&
    typeof verification.externalVerificationRedirectURL === "string" &&
    verification.externalVerificationRedirectURL.length > 0
  ) {
    return verification.externalVerificationRedirectURL;
  }

  if (
    verification &&
    typeof verification.externalVerificationRedirectURL === "object" &&
    verification.externalVerificationRedirectURL !== null &&
    "href" in verification.externalVerificationRedirectURL &&
    typeof (
      verification.externalVerificationRedirectURL as { href?: unknown }
    ).href === "string" &&
    (verification.externalVerificationRedirectURL as { href: string }).href.length > 0
  ) {
    return (verification.externalVerificationRedirectURL as { href: string }).href;
  }

  return null;
}

function isPendingSsoIntent(value: unknown): value is PendingSsoIntent {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<PendingSsoIntent>;

  return (
    (candidate.kind === "sign_in" || candidate.kind === "link_provider") &&
    (candidate.provider === "google" || candidate.provider === "spotify") &&
    typeof candidate.returnTo === "string" &&
    candidate.returnTo.length > 0 &&
    typeof candidate.createdAt === "number"
  );
}
