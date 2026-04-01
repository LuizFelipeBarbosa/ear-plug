"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { SignOutButton, useUser } from "@clerk/nextjs";
import { useAction } from "convex/react";
import { Loader2, ShieldCheck } from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import { getConvexErrorMessage } from "@/lib/convexErrors";
import { cn } from "@/lib/utils";

type SocialProvider = "spotify" | "google";
type ProviderAction = "connect" | "unlink";

const PROVIDERS: Array<{
  provider: SocialProvider;
  title: string;
}> = [
  {
    provider: "spotify",
    title: "Spotify",
  },
  {
    provider: "google",
    title: "Google",
  },
];

function getClerkErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "errors" in error &&
    Array.isArray((error as { errors?: Array<{ message?: unknown }> }).errors)
  ) {
    const message = (error as { errors?: Array<{ message?: unknown }> }).errors?.find(
      (entry) => typeof entry.message === "string" && entry.message.length > 0,
    )?.message;

    if (typeof message === "string") {
      return message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function formatDateTime(value: Date | null): string {
  if (!value) {
    return "Unknown";
  }

  return value.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatVerificationStatus(status?: string | null): string {
  if (!status) {
    return "Unknown";
  }

  return status.replace(/_/g, " ");
}

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
      <path
        fill="#FFC107"
        d="M43.61 20.08H42V20H24v8h11.3C33.66 32.66 29.24 36 24 36c-6.63 0-12-5.37-12-12s5.37-12 12-12c3.06 0 5.84 1.15 7.96 3.04l5.66-5.66C34.05 6.05 29.27 4 24 4 12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20c0-1.34-.14-2.65-.39-3.92Z"
      />
      <path
        fill="#FF3D00"
        d="M6.31 14.69 12.88 19.51C14.66 15.11 18.96 12 24 12c3.06 0 5.84 1.15 7.96 3.04l5.66-5.66C34.05 6.05 29.27 4 24 4 16.32 4 9.65 8.34 6.31 14.69Z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.09 0 9.78-1.95 13.33-5.13l-6.16-5.21C29.11 35.1 26.66 36 24 36c-5.22 0-9.63-3.32-11.28-7.95l-6.52 5.02C9.51 39.57 16.23 44 24 44Z"
      />
      <path
        fill="#1976D2"
        d="M43.61 20.08H42V20H24v8h11.3a12.04 12.04 0 0 1-4.13 5.66l6.16 5.21C36.89 39.2 44 34 44 24c0-1.34-.14-2.65-.39-3.92Z"
      />
    </svg>
  );
}

function SpotifyLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 168 168" aria-hidden="true" className={className}>
      <circle cx="84" cy="84" r="84" fill="#1ED760" />
      <path
        d="M120.6 72.2c-18.4-10.9-48.8-11.9-66.2-6.6"
        fill="none"
        stroke="#081C12"
        strokeLinecap="round"
        strokeWidth="11"
      />
      <path
        d="M114.8 89.7c-15.4-9.1-38.8-11.8-57-6.2"
        fill="none"
        stroke="#081C12"
        strokeLinecap="round"
        strokeWidth="9"
      />
      <path
        d="M108.2 106.1c-12.8-7.6-30.1-8.9-47.3-4.4"
        fill="none"
        stroke="#081C12"
        strokeLinecap="round"
        strokeWidth="8"
      />
    </svg>
  );
}

function ProviderLogo({
  provider,
  className,
}: {
  provider: SocialProvider;
  className?: string;
}) {
  const Logo = provider === "google" ? GoogleLogo : SpotifyLogo;

  return <Logo className={className} />;
}

export function AccountManagementPanel() {
  const { isLoaded, user } = useUser();
  const unlinkExternalAccount = useAction(api.users.unlinkExternalAccount);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [providerNotice, setProviderNotice] = useState<string | null>(null);
  const [activeProviderAction, setActiveProviderAction] = useState<{
    provider: SocialProvider;
    action: ProviderAction;
  } | null>(null);

  const externalAccountsByProvider = useMemo(() => {
    const entries = new Map<
      string,
      NonNullable<typeof user>["externalAccounts"][number]
    >();

    user?.externalAccounts.forEach((account) => {
      entries.set(account.provider, account);
    });

    return entries;
  }, [user]);

  if (!isLoaded || !user) {
    return (
      <div className="rounded-[30px] border border-border bg-card/95 p-5 shadow-soft sm:p-6">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading account management...
        </div>
      </div>
    );
  }

  const handleConnectProvider = async (provider: SocialProvider) => {
    setProviderError(null);
    setProviderNotice(null);
    setActiveProviderAction({ provider, action: "connect" });

    try {
      await user.createExternalAccount({
        strategy: `oauth_${provider}`,
        redirectUrl: "/sso-callback",
        ...(provider === "spotify"
          ? { additionalScopes: ["user-top-read", "user-follow-read"] }
          : {}),
      });
    } catch (error) {
      setProviderError(
        getClerkErrorMessage(error, `We couldn't start the ${provider} connection flow.`),
      );
      setActiveProviderAction(null);
    }
  };

  const handleUnlinkProvider = async (provider: SocialProvider) => {
    const account = externalAccountsByProvider.get(provider);

    if (!account) {
      return;
    }

    setProviderError(null);
    setProviderNotice(null);
    setActiveProviderAction({ provider, action: "unlink" });

    try {
      await unlinkExternalAccount({
        externalAccountId: account.id,
        provider,
      });
      await user.reload();
      setProviderNotice(`${account.providerTitle()} was unlinked from this account.`);
    } catch (error) {
      setProviderError(
        getConvexErrorMessage(error, `We couldn't unlink the ${provider} account.`),
      );
    } finally {
      setActiveProviderAction(null);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[30px] border border-border bg-card/95 p-5 shadow-soft sm:p-6">
        <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-[28px] border border-border/80 bg-background/88 p-5 shadow-soft dark:border-white/10 dark:bg-white/[0.05] sm:p-6">
            <div className="flex items-start gap-4">
              <div className="relative h-16 w-16 overflow-hidden rounded-[22px] border border-border bg-muted dark:border-white/10 dark:bg-white/[0.06]">
                <Image
                  src={user.imageUrl}
                  alt={user.fullName ?? "Profile image"}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Current identity
                </p>
                <h3 className="mt-1 text-xl font-semibold text-foreground">
                  {user.fullName ?? "Unnamed account"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Last sign-in {formatDateTime(user.lastSignInAt)}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-[22px] border border-border/70 bg-muted/40 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Primary email
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {user.primaryEmailAddress?.emailAddress ?? "None"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatVerificationStatus(user.primaryEmailAddress?.verification.status)}
                </p>
              </div>

              <div className="rounded-[22px] border border-border/70 bg-muted/40 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Primary phone
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {user.primaryPhoneNumber?.phoneNumber ?? "None"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatVerificationStatus(user.primaryPhoneNumber?.verification.status)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-border/80 bg-background/88 p-5 shadow-soft dark:border-white/10 dark:bg-white/[0.05] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Connected providers
                </p>
                <h3 className="mt-1 text-xl font-semibold text-foreground">
                  Social accounts
                </h3>
              </div>
              <div className="rounded-full border border-border bg-muted px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {user.externalAccounts.length} linked
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {PROVIDERS.map(({ provider, title }) => {
                const externalAccount = externalAccountsByProvider.get(provider);
                const isBusy = activeProviderAction?.provider === provider;
                const busyAction = isBusy ? activeProviderAction?.action : null;

                return (
                  <div
                    key={`summary-${provider}`}
                    className="rounded-[22px] border border-border/70 bg-muted/40 p-4 dark:border-white/10 dark:bg-white/[0.04]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/[0.06] bg-black/35">
                          <ProviderLogo provider={provider} className="h-6 w-6" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">{title}</p>
                          <p className="truncate text-sm text-muted-foreground">
                            {externalAccount
                              ? externalAccount.emailAddress ||
                                externalAccount.accountIdentifier()
                              : "Not connected"}
                          </p>
                        </div>
                      </div>

                      {externalAccount ? (
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
                            Connected
                          </span>
                          <button
                            type="button"
                            onClick={() => void handleUnlinkProvider(provider)}
                            disabled={activeProviderAction !== null}
                            className={cn(
                              "inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors disabled:cursor-not-allowed disabled:opacity-70",
                              busyAction === "unlink"
                                ? "border-red-500/30 bg-red-500/10 text-red-500"
                                : "border-border bg-background text-muted-foreground hover:border-red-500/30 hover:text-red-500",
                            )}
                          >
                            {busyAction === "unlink" ? "Unlinking" : "Unlink"}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleConnectProvider(provider)}
                          disabled={activeProviderAction !== null}
                          className="inline-flex shrink-0 items-center rounded-full bg-foreground px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-background transition-colors hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {busyAction === "connect" ? "Redirecting" : "Connect"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {providerError ? (
                <div className="rounded-[22px] border border-red-500/20 bg-red-500/5 px-4 py-3">
                  <p className="text-sm text-red-500">{providerError}</p>
                </div>
              ) : null}

              {providerNotice ? (
                <div className="rounded-[22px] border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                  <p className="text-sm text-emerald-600 dark:text-emerald-300">
                    {providerNotice}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="ml-auto grid max-w-[36rem] gap-5">
        <section className="rounded-[30px] border border-border bg-card/95 p-5 shadow-soft sm:p-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-muted dark:border-white/10 dark:bg-white/[0.04]">
                <ShieldCheck className="h-4 w-4 text-foreground" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Session
                </p>
                <h2 className="text-2xl font-semibold text-foreground">Sign out</h2>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              End this session and return to the custom EarPlug sign-in screen.
            </p>

            <SignOutButton redirectUrl="/">
              <button
                type="button"
                className="mt-5 inline-flex w-full items-center justify-center rounded-[18px] border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:border-red-500/30 hover:text-red-500"
              >
                Sign out
              </button>
            </SignOutButton>
        </section>
      </div>
    </div>
  );
}
