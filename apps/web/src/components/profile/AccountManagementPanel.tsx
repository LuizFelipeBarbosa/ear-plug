"use client";

import { type FormEvent, useMemo, useState } from "react";
import Image from "next/image";
import { SignOutButton, useUser } from "@clerk/nextjs";
import { useAction } from "convex/react";
import { Loader2 } from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import { useSocialOAuth } from "@/hooks/useSocialOAuth";
import {
  normalizeClerkExternalAccountProvider,
  type SocialProvider,
} from "@/lib/auth/sso";
import { getConvexErrorMessage } from "@/lib/convexErrors";
import { cn } from "@/lib/utils";

type ProviderAction = "connect" | "unlink";
type IdentityField = "email" | "phone";

interface VerificationTarget {
  id: string;
  attemptVerification: (params: { code: string }) => Promise<{
    verification?: { status?: string | null } | null;
  }>;
}

interface IdentityEditState {
  field: IdentityField;
  step: "input" | "verify";
  value: string;
  verificationCode: string;
  target: VerificationTarget | null;
}

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

function formatPhoneNumber(value?: string | null): string {
  if (!value) {
    return "None";
  }

  const digits = value.replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return value;
}

function normalizePhoneNumber(value: string): string | null {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  return null;
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
  const { startSocialOAuth } = useSocialOAuth();
  const [providerError, setProviderError] = useState<string | null>(null);
  const [providerNotice, setProviderNotice] = useState<string | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [identityNotice, setIdentityNotice] = useState<string | null>(null);
  const [identityEditState, setIdentityEditState] = useState<IdentityEditState | null>(
    null,
  );
  const [isSavingIdentity, setIsSavingIdentity] = useState(false);
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
      const normalizedProvider = normalizeClerkExternalAccountProvider(account.provider);

      if (normalizedProvider) {
        entries.set(normalizedProvider, account);
      }
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

  const openIdentityEditor = (field: IdentityField) => {
    setIdentityError(null);
    setIdentityNotice(null);
    setIdentityEditState({
      field,
      step: "input",
      value:
        field === "email"
          ? user.primaryEmailAddress?.emailAddress ?? ""
          : formatPhoneNumber(user.primaryPhoneNumber?.phoneNumber),
      verificationCode: "",
      target: null,
    });
  };

  const closeIdentityEditor = () => {
    if (isSavingIdentity) {
      return;
    }

    setIdentityEditState(null);
    setIdentityError(null);
  };

  const handleIdentityValueSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!identityEditState) {
      return;
    }

    setIdentityError(null);
    setIdentityNotice(null);
    setIsSavingIdentity(true);

    try {
      if (identityEditState.field === "email") {
        const nextEmail = identityEditState.value.trim().toLowerCase();
        const currentEmail = user.primaryEmailAddress?.emailAddress?.toLowerCase() ?? "";

        if (!nextEmail) {
          throw new Error("Enter an email address.");
        }

        if (nextEmail === currentEmail) {
          setIdentityEditState(null);
          return;
        }

        const emailAddress = await user.createEmailAddress({ email: nextEmail });
        await emailAddress.prepareVerification({ strategy: "email_code" });
        setIdentityEditState((prev) =>
          prev
            ? {
                ...prev,
                step: "verify",
                verificationCode: "",
                target: emailAddress,
              }
            : prev,
        );
        return;
      }

      const normalizedPhoneNumber = normalizePhoneNumber(identityEditState.value);
      const currentPhoneNumber = user.primaryPhoneNumber?.phoneNumber ?? "";

      if (!normalizedPhoneNumber) {
        throw new Error("Enter a valid US phone number.");
      }

      if (normalizedPhoneNumber === currentPhoneNumber) {
        setIdentityEditState(null);
        return;
      }

      const phoneNumber = await user.createPhoneNumber({
        phoneNumber: normalizedPhoneNumber,
      });
      await phoneNumber.prepareVerification();
      setIdentityEditState((prev) =>
        prev
          ? {
              ...prev,
              step: "verify",
              value: formatPhoneNumber(normalizedPhoneNumber),
              verificationCode: "",
              target: phoneNumber,
            }
          : prev,
      );
    } catch (error) {
      setIdentityError(
        getClerkErrorMessage(error, "We couldn't start that verification flow."),
      );
    } finally {
      setIsSavingIdentity(false);
    }
  };

  const handleIdentityVerificationSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!identityEditState?.target) {
      return;
    }

    setIdentityError(null);
    setIdentityNotice(null);
    setIsSavingIdentity(true);

    try {
      const result = await identityEditState.target.attemptVerification({
        code: identityEditState.verificationCode.trim(),
      });

      if (result.verification?.status !== "verified") {
        throw new Error("That code was not accepted. Try again.");
      }

      if (identityEditState.field === "email") {
        await user.update({ primaryEmailAddressId: identityEditState.target.id });
      } else {
        await user.update({ primaryPhoneNumberId: identityEditState.target.id });
      }

      await user.reload();
      setIdentityNotice(
        identityEditState.field === "email"
          ? "Primary email updated."
          : "Primary phone updated.",
      );
      setIdentityEditState(null);
    } catch (error) {
      setIdentityError(
        getClerkErrorMessage(error, "We couldn't verify that code."),
      );
    } finally {
      setIsSavingIdentity(false);
    }
  };

  const handleConnectProvider = async (provider: SocialProvider) => {
    setProviderError(null);
    setProviderNotice(null);
    setActiveProviderAction({ provider, action: "connect" });

    try {
      await startSocialOAuth({ provider });
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
        <div className="grid items-stretch gap-5 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="flex h-full flex-col rounded-[28px] border border-border/80 bg-background/88 p-5 shadow-soft dark:border-white/10 dark:bg-white/[0.05] sm:p-6">
            <div className="flex items-center gap-4">
              <div className="relative h-14 w-14 overflow-hidden rounded-[20px] border border-border bg-muted dark:border-white/10 dark:bg-white/[0.06]">
                <Image
                  src={user.imageUrl}
                  alt={user.fullName ?? "Profile image"}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Current identity
                </p>
                <h3 className="mt-1 text-[1.75rem] font-semibold leading-none text-foreground">
                  {user.fullName ?? "Unnamed account"}
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Last sign-in {formatDateTime(user.lastSignInAt)}
                </p>
              </div>
            </div>

            <div className="mt-4 grid flex-1 auto-rows-fr gap-3">
              <div className="rounded-[22px] border border-border/70 bg-muted/40 px-4 py-3.5 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="flex h-full items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Primary email
                    </p>
                    <p className="mt-2 truncate text-sm font-medium text-foreground">
                      {user.primaryEmailAddress?.emailAddress ?? "None"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openIdentityEditor("email")}
                    className="inline-flex shrink-0 items-center rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
                  >
                    Edit
                  </button>
                </div>
              </div>

              <div className="rounded-[22px] border border-border/70 bg-muted/40 px-4 py-3.5 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="flex h-full items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Primary phone
                    </p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {formatPhoneNumber(user.primaryPhoneNumber?.phoneNumber)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openIdentityEditor("phone")}
                    className="inline-flex shrink-0 items-center rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
                  >
                    Edit
                  </button>
                </div>
              </div>

              {identityError ? (
                <div className="rounded-[22px] border border-red-500/20 bg-red-500/5 px-4 py-3">
                  <p className="text-sm text-red-500">{identityError}</p>
                </div>
              ) : null}

              {identityNotice ? (
                <div className="rounded-[22px] border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                  <p className="text-sm text-emerald-600 dark:text-emerald-300">
                    {identityNotice}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex h-full flex-col rounded-[28px] border border-border/80 bg-background/88 p-5 shadow-soft dark:border-white/10 dark:bg-white/[0.05] sm:p-6">
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

            <div className="mt-4 grid flex-1 auto-rows-fr gap-3">
              {PROVIDERS.map(({ provider, title }) => {
                const externalAccount = externalAccountsByProvider.get(provider);
                const isBusy = activeProviderAction?.provider === provider;
                const busyAction = isBusy ? activeProviderAction?.action : null;

                return (
                  <div
                    key={`summary-${provider}`}
                    className="rounded-[22px] border border-border/70 bg-muted/40 px-4 py-3.5 dark:border-white/10 dark:bg-white/[0.04]"
                  >
                    <div className="flex h-full items-center justify-between gap-3">
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
        <SignOutButton redirectUrl="/">
          <button
            type="button"
            className="mt-5 inline-flex w-full items-center justify-center rounded-[22px] border border-border bg-background px-5 py-4 text-base font-semibold text-foreground transition-colors hover:border-red-500/30 hover:text-red-500"
          >
            Sign out
          </button>
        </SignOutButton>
      </section>

      {identityEditState ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-border bg-card p-5 shadow-soft sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {identityEditState.field === "email" ? "Primary email" : "Primary phone"}
                </p>
                <h3 className="mt-1 text-xl font-semibold text-foreground">
                  {identityEditState.step === "input"
                    ? `Edit ${identityEditState.field}`
                    : "Enter verification code"}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeIdentityEditor}
                disabled={isSavingIdentity}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                Close
              </button>
            </div>

            <form
              onSubmit={
                identityEditState.step === "input"
                  ? handleIdentityValueSubmit
                  : handleIdentityVerificationSubmit
              }
              className="mt-5 space-y-4"
            >
              {identityEditState.step === "input" ? (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {identityEditState.field === "email" ? "Email address" : "Phone number"}
                  </label>
                  <input
                    type={identityEditState.field === "email" ? "email" : "tel"}
                    value={identityEditState.value}
                    onChange={(event) =>
                      setIdentityEditState((prev) =>
                        prev ? { ...prev, value: event.target.value } : prev,
                      )
                    }
                    placeholder={
                      identityEditState.field === "email"
                        ? "name@example.com"
                        : "(555) 555-5555"
                    }
                    className="mt-2 w-full rounded-[18px] border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-foreground/20"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Confirmation code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={identityEditState.verificationCode}
                    onChange={(event) =>
                      setIdentityEditState((prev) =>
                        prev
                          ? { ...prev, verificationCode: event.target.value }
                          : prev,
                      )
                    }
                    placeholder="123456"
                    className="mt-2 w-full rounded-[18px] border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-foreground/20"
                  />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {identityEditState.field === "email"
                      ? "Enter the code sent to your new email address."
                      : "Enter the code sent to your new phone number."}
                  </p>
                </div>
              )}

              {identityError ? (
                <div className="rounded-[18px] border border-red-500/20 bg-red-500/5 px-4 py-3">
                  <p className="text-sm text-red-500">{identityError}</p>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSavingIdentity}
                className="inline-flex w-full items-center justify-center rounded-[18px] bg-foreground px-4 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSavingIdentity ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {identityEditState.step === "input" ? "Sending code" : "Saving"}
                  </span>
                ) : identityEditState.step === "input" ? (
                  "Continue"
                ) : (
                  "Verify and save"
                )}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
