"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SignOutButton, useUser } from "@clerk/nextjs";
import {
  Apple,
  ChevronLeft,
  Loader2,
  LockKeyhole,
  Mail,
  Music2,
  Phone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { BrandWordmark } from "@/components/branding/BrandLogo";
import { cn } from "@/lib/utils";

type SocialProvider = "spotify" | "google" | "apple";

const PROVIDERS: Array<{
  provider: SocialProvider;
  title: string;
  eyebrow: string;
  description: string;
}> = [
  {
    provider: "spotify",
    title: "Spotify",
    eyebrow: "Taste sync",
    description:
      "Reconnect here when EarPlug needs fresh top-artist and followed-artist scopes.",
  },
  {
    provider: "google",
    title: "Google",
    eyebrow: "Fast login",
    description:
      "Keep your fastest sign-in option attached to this account.",
  },
  {
    provider: "apple",
    title: "Apple",
    eyebrow: "Private entry",
    description:
      "Use Apple for a cleaner login path with private relay when available.",
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

function getProviderBadge(provider: SocialProvider) {
  if (provider === "apple") {
    return <Apple className="h-4 w-4" />;
  }

  if (provider === "spotify") {
    return <Music2 className="h-4 w-4" />;
  }

  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[10px] font-bold uppercase tracking-[0.18em]">
      G
    </span>
  );
}

function parseApprovedScopes(value: string): string[] {
  return value
    .split(/[,\s]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
}

export function AccountManagementView() {
  const { isLoaded, user } = useUser();
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [providerNotice, setProviderNotice] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<SocialProvider | null>(null);

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
      <div className="min-h-screen bg-background px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-[32px] border border-border bg-card/90 p-8 shadow-soft">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading account management...
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleConnectProvider = async (provider: SocialProvider) => {
    setProviderError(null);
    setProviderNotice(null);
    setActiveProvider(provider);

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
      setActiveProvider(null);
    }
  };

  const handleReconnectProvider = async (provider: SocialProvider) => {
    const account = externalAccountsByProvider.get(provider);

    if (!account) {
      await handleConnectProvider(provider);
      return;
    }

    setProviderError(null);
    setProviderNotice(null);
    setActiveProvider(provider);

    try {
      await account.reauthorize({
        redirectUrl: "/sso-callback",
        ...(provider === "spotify"
          ? { additionalScopes: ["user-top-read", "user-follow-read"] }
          : {}),
      });
      setProviderNotice(
        provider === "spotify"
          ? "Spotify reconnect started. Approve the scopes and EarPlug will be able to sync taste data."
          : `${account.providerTitle()} reconnect started.`,
      );
    } catch (error) {
      setProviderError(
        getClerkErrorMessage(
          error,
          `We couldn't start the ${provider} reconnect flow.`,
        ),
      );
      setActiveProvider(null);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!passwordForm.newPassword.trim()) {
      setPasswordError("Enter a new password.");
      return;
    }

    setPasswordError(null);
    setPasswordNotice(null);
    setIsSavingPassword(true);

    try {
      await user.updatePassword({
        newPassword: passwordForm.newPassword,
        ...(user.passwordEnabled
          ? { currentPassword: passwordForm.currentPassword }
          : {}),
      });

      setPasswordForm({ currentPassword: "", newPassword: "" });
      setPasswordNotice(
        user.passwordEnabled
          ? "Password updated."
          : "Password created. You can now use password sign-in on this account.",
      );
    } catch (error) {
      setPasswordError(
        getClerkErrorMessage(error, "We couldn't update the password."),
      );
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-fan/30 hover:text-fan"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Profile
          </Link>

          <div className="rounded-full border border-border bg-card px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Custom account management
          </div>
        </div>

        <section className="overflow-hidden rounded-[34px] border border-border bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.12),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.9))] p-6 shadow-soft sm:p-8 dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.2),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.14),transparent_24%),linear-gradient(180deg,rgba(9,12,19,0.95),rgba(7,9,14,0.98))]">
          <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full border border-border/70 bg-background/80 px-4 py-2 backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
                <BrandWordmark className="w-[7.75rem]" theme="auto" decorative sizes="124px" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Accounts
                </span>
              </div>

              <h1 className="mt-6 max-w-xl font-serif text-[2.4rem] leading-[0.94] tracking-[-0.045em] text-foreground sm:text-[3.2rem]">
                Identity, providers, and security in the same visual language as the rest of the app.
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
                This replaces the default Clerk profile shell with a custom account surface built on top of Clerk resources. Spotify reconnect lives here too.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[24px] border border-border/70 bg-background/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <Mail className="h-4 w-4 text-fan" />
                  <p className="mt-3 text-lg font-semibold text-foreground">
                    {user.emailAddresses.length}
                  </p>
                  <p className="text-xs leading-5 text-muted-foreground">
                    email address{user.emailAddresses.length === 1 ? "" : "es"}
                  </p>
                </div>
                <div className="rounded-[24px] border border-border/70 bg-background/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <Phone className="h-4 w-4 text-amber-500" />
                  <p className="mt-3 text-lg font-semibold text-foreground">
                    {user.phoneNumbers.length}
                  </p>
                  <p className="text-xs leading-5 text-muted-foreground">
                    phone number{user.phoneNumbers.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="rounded-[24px] border border-border/70 bg-background/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <p className="mt-3 text-lg font-semibold text-foreground">
                    {user.externalAccounts.length}
                  </p>
                  <p className="text-xs leading-5 text-muted-foreground">
                    connected provider{user.externalAccounts.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-border/80 bg-background/88 p-5 shadow-soft backdrop-blur dark:border-white/10 dark:bg-white/[0.05] sm:p-6">
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
                  <h2 className="mt-1 text-xl font-semibold text-foreground">
                    {user.fullName ?? "Unnamed account"}
                  </h2>
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
                    {formatVerificationStatus(
                      user.primaryEmailAddress?.verification.status,
                    )}
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
                    {formatVerificationStatus(
                      user.primaryPhoneNumber?.verification.status,
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <section className="rounded-[30px] border border-border bg-card/95 p-5 shadow-soft sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Connected providers
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-foreground">
                  Social accounts
                </h2>
              </div>
              <div className="rounded-full border border-border bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                OAuth
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {PROVIDERS.map(({ provider, title, eyebrow, description }) => {
                const externalAccount = externalAccountsByProvider.get(provider);
                const approvedScopes =
                  provider === "spotify" && externalAccount?.approvedScopes
                    ? parseApprovedScopes(externalAccount.approvedScopes)
                    : [];
                const isBusy = activeProvider === provider;

                return (
                  <div
                    key={provider}
                    className="rounded-[24px] border border-border/70 bg-background/70 p-5 dark:border-white/10 dark:bg-white/[0.03]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="inline-flex items-center gap-2 text-foreground">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-border/70 bg-card dark:border-white/10 dark:bg-white/[0.05]">
                          {getProviderBadge(provider)}
                        </span>
                        <div>
                          <p className="text-sm font-semibold">{title}</p>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            {eyebrow}
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                          externalAccount
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {externalAccount ? "Connected" : "Available"}
                      </span>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-muted-foreground">
                      {description}
                    </p>

                    {externalAccount ? (
                      <div className="mt-4 space-y-3 rounded-[20px] border border-border/60 bg-muted/35 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Connected account
                          </p>
                          <p className="mt-1 text-sm font-medium text-foreground">
                            {externalAccount.emailAddress ||
                              externalAccount.accountIdentifier()}
                          </p>
                        </div>

                        {approvedScopes.length > 0 ? (
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              Approved scopes
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {approvedScopes.map((scope) => (
                                <span
                                  key={scope}
                                  className="rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground"
                                >
                                  {scope}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onClick={() =>
                        void (
                          externalAccount
                            ? handleReconnectProvider(provider)
                            : handleConnectProvider(provider)
                        )
                      }
                      disabled={activeProvider !== null}
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[18px] bg-foreground px-4 py-3 text-sm font-semibold text-background transition-colors hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isBusy ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Redirecting
                        </>
                      ) : externalAccount ? (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          {provider === "spotify" ? "Reconnect & Refresh Scopes" : "Reconnect"}
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Connect {title}
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {providerError ? (
              <div className="mt-5 rounded-[22px] border border-red-500/20 bg-red-500/5 px-4 py-3">
                <p className="text-sm text-red-500">{providerError}</p>
              </div>
            ) : null}

            {providerNotice ? (
              <div className="mt-5 rounded-[22px] border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                <p className="text-sm text-emerald-600 dark:text-emerald-300">
                  {providerNotice}
                </p>
              </div>
            ) : null}
          </section>

          <div className="space-y-6">
            <section className="rounded-[30px] border border-border bg-card/95 p-5 shadow-soft sm:p-6">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-muted dark:border-white/10 dark:bg-white/[0.04]">
                  <LockKeyhole className="h-4 w-4 text-foreground" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Security
                  </p>
                  <h2 className="text-2xl font-semibold text-foreground">
                    Password
                  </h2>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {user.passwordEnabled ? (
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Current password
                    </span>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(event) =>
                        setPasswordForm((current) => ({
                          ...current,
                          currentPassword: event.target.value,
                        }))
                      }
                      className="w-full rounded-[18px] border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-fan/20"
                      placeholder="Enter current password"
                      autoComplete="current-password"
                    />
                  </label>
                ) : (
                  <div className="rounded-[20px] border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                    <p className="text-sm text-amber-600 dark:text-amber-300">
                      This account does not have a password yet. Set one here if you want password sign-in in addition to code or social login.
                    </p>
                  </div>
                )}

                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    New password
                  </span>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(event) =>
                      setPasswordForm((current) => ({
                        ...current,
                        newPassword: event.target.value,
                      }))
                    }
                    className="w-full rounded-[18px] border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-fan/20"
                    placeholder="Choose a new password"
                    autoComplete="new-password"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => void handlePasswordSubmit()}
                  disabled={isSavingPassword}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] bg-fan px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-fan/90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSavingPassword ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving
                    </>
                  ) : user.passwordEnabled ? (
                    "Update password"
                  ) : (
                    "Create password"
                  )}
                </button>
              </div>

              {passwordError ? (
                <div className="mt-4 rounded-[20px] border border-red-500/20 bg-red-500/5 px-4 py-3">
                  <p className="text-sm text-red-500">{passwordError}</p>
                </div>
              ) : null}

              {passwordNotice ? (
                <div className="mt-4 rounded-[20px] border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                  <p className="text-sm text-emerald-600 dark:text-emerald-300">
                    {passwordNotice}
                  </p>
                </div>
              ) : null}
            </section>

            <section className="rounded-[30px] border border-border bg-card/95 p-5 shadow-soft sm:p-6">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-muted dark:border-white/10 dark:bg-white/[0.04]">
                  <ShieldCheck className="h-4 w-4 text-foreground" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Session
                  </p>
                  <h2 className="text-2xl font-semibold text-foreground">
                    Sign out
                  </h2>
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
      </div>
    </div>
  );
}
