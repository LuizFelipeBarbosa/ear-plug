"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useSignIn, useSignUp } from "@clerk/nextjs";
import { ArrowRight, Loader2, Phone, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/branding/BrandLogo";
import { ResponsiveSheetModal } from "@/components/ui/ResponsiveSheetModal";
import { useSocialOAuth } from "@/hooks/useSocialOAuth";
import { type SocialProvider } from "@/lib/auth/sso";
import { cn } from "@/lib/utils";

type PhoneFlowKind = "sign-in" | "sign-up";
const E164_REGEX = /^\+[1-9]\d{9,14}$/;

interface PendingPhoneFlow {
  kind: PhoneFlowKind;
  destination: string;
  destinationLabel: string;
}

interface AuthFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete?: string;
  type?: "text" | "tel";
  inputMode?: "text" | "tel" | "numeric";
  icon?: ReactNode;
}

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

function hasClerkErrorCode(error: unknown, code: string): boolean {
  if (
    typeof error !== "object" ||
    error === null ||
    !("errors" in error) ||
    !Array.isArray((error as { errors?: Array<{ code?: unknown }> }).errors)
  ) {
    return false;
  }

  return (error as { errors?: Array<{ code?: unknown }> }).errors?.some(
    (entry) => entry.code === code,
  ) ?? false;
}

function shouldFallbackToPhoneSignUp(error: unknown): boolean {
  if (hasClerkErrorCode(error, "form_identifier_not_found")) {
    return true;
  }

  const message = getClerkErrorMessage(error, "").toLowerCase();

  return (
    message.includes("couldn't find") ||
    message.includes("not found") ||
    message.includes("doesn't exist")
  );
}

function normalizePhoneNumber(value: string):
  | { ok: true; e164: string }
  | { ok: false; message: string } {
  const trimmed = value.trim();
  if (!trimmed) {
    return {
      ok: false,
      message: "Enter your phone number to continue.",
    };
  }

  if (trimmed.startsWith("+")) {
    const digits = trimmed.slice(1).replace(/\D/g, "");
    const e164 = `+${digits}`;
    if (E164_REGEX.test(e164)) {
      return { ok: true, e164 };
    }

    return {
      ok: false,
      message: "Enter a valid phone number in international format.",
    };
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) {
    return { ok: true, e164: `+1${digits}` };
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return { ok: true, e164: `+${digits}` };
  }

  return {
    ok: false,
    message: "Enter a valid US phone number or full international format.",
  };
}

function formatUsPhoneNumber(digits: string, prefix = ""): string {
  if (digits.length === 0) {
    return prefix;
  }

  if (digits.length < 4) {
    return `${prefix}${digits}`;
  }

  if (digits.length < 7) {
    return `${prefix}(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }

  return `${prefix}(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

function formatPhoneNumberInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("+")) {
    const digits = trimmed.slice(1).replace(/\D/g, "");
    if (digits.startsWith("1") && digits.length <= 11) {
      return formatUsPhoneNumber(digits.slice(1), "+1 ");
    }

    return `+${digits}`;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length <= 10) {
    return formatUsPhoneNumber(digits);
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return formatUsPhoneNumber(digits.slice(1), "1 ");
  }

  return digits;
}

function formatDestinationLabel(destination: string): string {
  if (destination.startsWith("+1") && destination.length === 12) {
    return formatUsPhoneNumber(destination.slice(2));
  }

  return formatPhoneNumberInput(destination);
}

function AuthField({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  type = "text",
  inputMode = "text",
  icon,
}: AuthFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
        {label}
      </span>
      <div className="group flex items-center gap-3 rounded-[20px] border border-white/[0.08] bg-white/[0.045] px-4 py-3.5 transition-colors focus-within:border-white/[0.18] focus-within:bg-white/[0.08]">
        {icon ? (
          <span className="text-zinc-500 transition-colors group-focus-within:text-white">
            {icon}
          </span>
        ) : null}
        <input
          type={type}
          inputMode={inputMode}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full bg-transparent text-[15px] text-zinc-50 placeholder:text-zinc-500 focus:outline-none"
        />
      </div>
    </label>
  );
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

function ProviderButton({
  provider,
  label,
  disabled,
  isLoading,
  onClick,
}: {
  provider: SocialProvider;
  label: string;
  disabled: boolean;
  isLoading: boolean;
  onClick: () => void;
}) {
  const Logo = provider === "google" ? GoogleLogo : SpotifyLogo;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group rounded-[22px] border border-white/[0.08] bg-white/[0.045] px-4 py-4 text-left transition-colors hover:border-white/[0.14] hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-70"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.06] bg-black/35">
            <Logo className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-white">{label}</p>
        </div>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-zinc-300" />
        ) : (
          <ArrowRight className="h-4 w-4 text-zinc-500 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
        )}
      </div>
    </button>
  );
}

export function CustomAuthPanel({
  externalNotice = null,
}: {
  externalNotice?: string | null;
}) {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const {
    isLoaded: isSignInLoaded,
    signIn,
    setActive: setActiveSignIn,
  } = useSignIn();
  const {
    isLoaded: isSignUpLoaded,
    signUp,
    setActive: setActiveSignUp,
  } = useSignUp();
  const { startSocialOAuth } = useSocialOAuth();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingPhoneFlow, setPendingPhoneFlow] = useState<PendingPhoneFlow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oauthLoadingProvider, setOauthLoadingProvider] = useState<SocialProvider | null>(
    null,
  );

  const resetPhoneFlow = () => {
    setPendingPhoneFlow(null);
    setVerificationCode("");
    setError(null);
    setNotice(null);
  };

  const finalizeSession = async (
    sessionId: string | null | undefined,
    flowKind: PhoneFlowKind,
  ) => {
    if (!sessionId) {
      throw new Error("The authentication flow completed without a session.");
    }

    if (flowKind === "sign-up") {
      await setActiveSignUp?.({ session: sessionId });
    } else {
      await setActiveSignIn?.({ session: sessionId });
    }

    router.push("/");
  };

  const startPhoneSignUp = async (normalizedPhoneNumber: string) => {
    if (!isSignUpLoaded || !signUp) {
      throw new Error("Account creation is still loading. Try again in a moment.");
    }

    await signUp.create({ phoneNumber: normalizedPhoneNumber });
    await signUp.preparePhoneNumberVerification();
    setPendingPhoneFlow({
      kind: "sign-up",
      destination: normalizedPhoneNumber,
      destinationLabel: formatDestinationLabel(normalizedPhoneNumber),
    });
    setVerificationCode("");
    setNotice("Code sent.");
  };

  const handleSocialAuth = async (provider: SocialProvider) => {
    setError(null);
    setNotice(null);
    setOauthLoadingProvider(provider);

    try {
      await startSocialOAuth({ provider });
    } catch (caughtError) {
      setError(
        getClerkErrorMessage(
          caughtError,
          `We couldn't start ${provider} sign-in right now.`,
        ),
      );
    } finally {
      setOauthLoadingProvider(null);
    }
  };

  const handleSendPhoneCode = async () => {
    if (!isSignInLoaded || !signIn) {
      return;
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone.ok) {
      setError(normalizedPhone.message);
      return;
    }
    const normalizedPhoneNumber = normalizedPhone.e164;

    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      await signIn.create({
        strategy: "phone_code",
        identifier: normalizedPhoneNumber,
      });

      setPendingPhoneFlow({
        kind: "sign-in",
        destination: normalizedPhoneNumber,
        destinationLabel: formatDestinationLabel(normalizedPhoneNumber),
      });
      setVerificationCode("");
      setNotice("Code sent.");
    } catch (caughtError) {
      if (shouldFallbackToPhoneSignUp(caughtError)) {
        try {
          await startPhoneSignUp(normalizedPhoneNumber);
        } catch (signUpError) {
          setError(
            getClerkErrorMessage(
              signUpError,
              "We couldn't start account creation with that phone number.",
            ),
          );
        }
      } else {
        setError(
          getClerkErrorMessage(
            caughtError,
            "We couldn't send a verification code to that phone number.",
          ),
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyPhoneCode = async () => {
    if (!pendingPhoneFlow) {
      return;
    }

    const trimmedCode = verificationCode.trim();
    if (!trimmedCode) {
      setError("Enter the confirmation code from your phone.");
      return;
    }

    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      if (pendingPhoneFlow.kind === "sign-in") {
        if (!isSignInLoaded || !signIn) {
          return;
        }

        const result = await signIn.attemptFirstFactor({
          strategy: "phone_code",
          code: trimmedCode,
        });

        if (result.status !== "complete") {
          throw new Error("That confirmation code wasn't accepted.");
        }

        await finalizeSession(result.createdSessionId, "sign-in");
        return;
      }

      if (!isSignUpLoaded || !signUp) {
        return;
      }

      const result = await signUp.attemptPhoneNumberVerification({
        code: trimmedCode,
      });

      if (result.status !== "complete") {
        throw new Error(
          "This account needs additional required fields in Clerk before sign-in can finish.",
        );
      }

      await finalizeSession(result.createdSessionId, "sign-up");
    } catch (caughtError) {
      setError(
        getClerkErrorMessage(
          caughtError,
          "We couldn't verify that confirmation code.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (!pendingPhoneFlow) {
      return;
    }

    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      if (pendingPhoneFlow.kind === "sign-in") {
        if (!isSignInLoaded || !signIn) {
          return;
        }

        await signIn.create({
          strategy: "phone_code",
          identifier: pendingPhoneFlow.destination,
        });
      } else {
        if (!isSignUpLoaded || !signUp) {
          return;
        }

        await signUp.preparePhoneNumberVerification();
      }

      setNotice("New code sent.");
    } catch (caughtError) {
      setError(
        getClerkErrorMessage(
          caughtError,
          "We couldn't resend the verification code.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl animate-fade-in">
      <div className="relative overflow-hidden rounded-[34px] border border-white/[0.14] bg-black/30 shadow-[0_50px_140px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(22,163,74,0.18),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.05)_0%,transparent_28%,transparent_70%,rgba(255,255,255,0.04)_100%)]" />

        <div className="relative px-6 py-6 sm:px-8 sm:py-8">
          <div className="flex items-center justify-between gap-4">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/[0.08] bg-black/25 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-200">
              <BrandMark className="w-6" theme="dark" decorative sizes="24px" />
              EarPlug
            </div>
            <div className="rounded-full border border-white/[0.06] bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-400">
              Listen Local
            </div>
          </div>

          <div className="mt-6 rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(7,10,17,0.92),rgba(10,10,12,0.96))] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.35)] sm:p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <ProviderButton
                provider="google"
                label="Sign in with Google"
                disabled={oauthLoadingProvider !== null || isSubmitting}
                isLoading={oauthLoadingProvider === "google"}
                onClick={() => void handleSocialAuth("google")}
              />
              <ProviderButton
                provider="spotify"
                label="Sign in with Spotify"
                disabled={oauthLoadingProvider !== null || isSubmitting}
                isLoading={oauthLoadingProvider === "spotify"}
                onClick={() => void handleSocialAuth("spotify")}
              />
            </div>

            {!isSignedIn ? (
              <>
                <div className="my-6 flex items-center gap-4">
                  <div className="h-px flex-1 bg-white/10" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                    Or continue with phone
                  </p>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <div className="space-y-4">
                  <AuthField
                    label="Phone Number"
                    value={phoneNumber}
                    onChange={(value) => setPhoneNumber(formatPhoneNumberInput(value))}
                    placeholder="(415) 555-0123"
                    autoComplete="tel"
                    type="tel"
                    inputMode="tel"
                    icon={<Phone className="h-4 w-4" />}
                  />
                  <button
                    type="button"
                    onClick={() => void handleSendPhoneCode()}
                    disabled={isSubmitting || oauthLoadingProvider !== null}
                    className={cn(
                      "flex w-full items-center justify-center gap-2 rounded-[20px] bg-white px-4 py-3.5 text-sm font-semibold text-zinc-950 transition-colors",
                      isSubmitting || oauthLoadingProvider !== null
                        ? "cursor-not-allowed opacity-70"
                        : "hover:bg-zinc-200",
                    )}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                    Send confirmation code
                  </button>
                </div>
              </>
            ) : null}

            {!pendingPhoneFlow && notice ? (
              <div className="mt-4 rounded-[20px] border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                <p className="text-sm text-emerald-200">{notice}</p>
              </div>
            ) : null}

            {!pendingPhoneFlow && error ? (
              <div className="mt-4 rounded-[20px] border border-red-500/25 bg-red-500/10 px-4 py-3">
                <p className="text-sm text-red-200">{error}</p>
              </div>
            ) : null}

            {!pendingPhoneFlow && !notice && !error && externalNotice ? (
              <div className="mt-4 rounded-[20px] border border-white/[0.08] bg-white/[0.04] px-4 py-3">
                <p className="text-sm text-zinc-200">{externalNotice}</p>
              </div>
            ) : null}

            <div id="clerk-captcha" className="mt-4" />
          </div>
        </div>
      </div>

      <ResponsiveSheetModal
        isOpen={pendingPhoneFlow !== null}
        onClose={resetPhoneFlow}
        labelledBy="phone-confirmation-title"
        panelClassName="sm:max-w-md border-white/[0.08] bg-[#090a0f]"
        backdropClassName="bg-black/80 backdrop-blur-md"
      >
        {pendingPhoneFlow ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#090a0f] text-white">
            <div className="flex-1 px-5 py-5 sm:px-6 sm:py-6">
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-3 rounded-full border border-white/[0.08] bg-black/20 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-200">
                  <BrandMark className="w-6" theme="dark" decorative sizes="24px" />
                  EarPlug
                </div>
                <div className="rounded-full border border-white/[0.06] bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-400">
                  Code
                </div>
              </div>

              <div className="mt-6">
                <h2
                  id="phone-confirmation-title"
                  className="text-[1.65rem] font-semibold tracking-[-0.03em] text-white"
                >
                  Enter code
                </h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Sent to{" "}
                  <span className="font-semibold text-zinc-100">
                    {pendingPhoneFlow.destinationLabel}
                  </span>
                </p>
              </div>

              <div className="mt-5">
                <AuthField
                  label="Code"
                  value={verificationCode}
                  onChange={setVerificationCode}
                  placeholder="123456"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                />
              </div>

              {notice ? (
                <div className="mt-4 rounded-[18px] border border-emerald-500/20 bg-emerald-500/[0.08] px-4 py-3">
                  <p className="text-sm text-emerald-200">{notice}</p>
                </div>
              ) : null}

              {error ? (
                <div className="mt-4 rounded-[18px] border border-red-500/20 bg-red-500/[0.08] px-4 py-3">
                  <p className="text-sm text-red-200">{error}</p>
                </div>
              ) : null}

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void handleVerifyPhoneCode()}
                  disabled={isSubmitting || oauthLoadingProvider !== null}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-[20px] bg-white px-4 py-3.5 text-sm font-semibold text-zinc-950 transition-colors",
                    isSubmitting || oauthLoadingProvider !== null
                      ? "cursor-not-allowed opacity-70"
                      : "hover:bg-zinc-200",
                  )}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  Verify code
                </button>
                <button
                  type="button"
                  onClick={() => void handleResendCode()}
                  disabled={isSubmitting || oauthLoadingProvider !== null}
                  className={cn(
                    "rounded-[20px] border border-white/[0.08] bg-white/[0.045] px-4 py-3.5 text-sm font-semibold text-white transition-colors",
                    isSubmitting || oauthLoadingProvider !== null
                      ? "cursor-not-allowed opacity-70"
                      : "hover:border-white/[0.14] hover:bg-white/[0.08]",
                  )}
                  >
                    Resend code
                  </button>
              </div>
              <button
                type="button"
                onClick={resetPhoneFlow}
                disabled={isSubmitting}
                className="mt-4 w-full text-sm font-medium text-zinc-400 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                Change phone number
              </button>
            </div>
          </div>
        ) : null}
      </ResponsiveSheetModal>
    </div>
  );
}
