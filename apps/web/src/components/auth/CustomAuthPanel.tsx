"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSignIn, useSignUp } from "@clerk/nextjs";
import {
  Apple,
  ArrowRight,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  Mail,
  MessageSquareQuote,
  Phone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { BrandMark } from "@/components/branding/BrandLogo";
import { cn } from "@/lib/utils";

type AuthMode = "sign-in" | "sign-up";
type SignInMethod = "password" | "code";
type SignUpContactMethod = "email" | "phone";
type SocialProvider = "google" | "apple" | "spotify";

type PendingStep =
  | null
  | {
      kind: "sign-in-code";
      strategy: "email_code" | "phone_code";
      destination: string;
      destinationLabel: string;
    }
  | {
      kind: "sign-up-email";
      destination: string;
      destinationLabel: string;
    }
  | {
      kind: "sign-up-phone";
      destination: string;
      destinationLabel: string;
    };

const SOCIAL_PROVIDERS: Array<{
  provider: SocialProvider;
  label: string;
  eyebrow: string;
}> = [
  { provider: "spotify", label: "Spotify", eyebrow: "Taste graph" },
  { provider: "google", label: "Google", eyebrow: "Fastest way in" },
  { provider: "apple", label: "Apple", eyebrow: "Private sign-in" },
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

function isLikelyEmail(value: string): boolean {
  return /\S+@\S+\.\S+/.test(value.trim());
}

function getProviderBadge(provider: SocialProvider) {
  if (provider === "apple") {
    return <Apple className="h-4 w-4" />;
  }

  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[10px] font-bold uppercase tracking-[0.18em]">
      {provider === "google" ? "G" : "S"}
    </span>
  );
}

function formatDestinationLabel(destination: string): string {
  if (destination.length <= 24) {
    return destination;
  }

  return `${destination.slice(0, 8)}...${destination.slice(-8)}`;
}

interface AuthFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete?: string;
  type?: "text" | "email" | "password" | "tel";
  icon?: React.ReactNode;
}

function AuthField({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  type = "text",
  icon,
}: AuthFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
        {label}
      </span>
      <div className="group flex items-center gap-3 rounded-[20px] border border-white/12 bg-white/[0.045] px-4 py-3.5 transition-colors focus-within:border-white/35 focus-within:bg-white/[0.08]">
        {icon ? (
          <span className="text-zinc-500 transition-colors group-focus-within:text-white">
            {icon}
          </span>
        ) : null}
        <input
          type={type}
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

interface AuthPanelProps {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
}

export function CustomAuthPanel({ mode, onModeChange }: AuthPanelProps) {
  const router = useRouter();
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

  const [signInMethod, setSignInMethod] = useState<SignInMethod>("password");
  const [signUpContactMethod, setSignUpContactMethod] =
    useState<SignUpContactMethod>("email");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingStep, setPendingStep] = useState<PendingStep>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oauthLoadingProvider, setOauthLoadingProvider] =
    useState<SocialProvider | null>(null);

  useEffect(() => {
    setError(null);
    setNotice(null);
    setPendingStep(null);
    setVerificationCode("");
    setIsSubmitting(false);
  }, [mode]);

  const authSubtitle = useMemo(() => {
    if (mode === "sign-in") {
      return "A custom backstage door for fans, bands, and the people filling Bay Area rooms tonight.";
    }

    return "Claim your place in the local scene with a cleaner sign-up flow that feels like EarPlug, not a widget.";
  }, [mode]);

  const codeDestinationLabel = pendingStep?.destinationLabel ?? "";

  const handleSocialAuth = async (provider: SocialProvider) => {
    const strategy = `oauth_${provider}` as const;

    setError(null);
    setNotice(null);
    setOauthLoadingProvider(provider);

    try {
      if (mode === "sign-up") {
        if (!isSignUpLoaded || !signUp) {
          return;
        }

        await signUp.authenticateWithRedirect({
          strategy,
          redirectUrl: "/sso-callback",
          redirectUrlComplete: "/",
        });
        return;
      }

      if (!isSignInLoaded || !signIn) {
        return;
      }

      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/",
      });
    } catch (caughtError) {
      setError(
        getClerkErrorMessage(
          caughtError,
          `We couldn't start ${provider} sign-in right now.`,
        ),
      );
      setOauthLoadingProvider(null);
    }
  };

  const finalizeSession = async (sessionId: string | null | undefined) => {
    if (!sessionId) {
      throw new Error("The authentication flow completed without a session.");
    }

    if (pendingStep?.kind === "sign-up-email" || pendingStep?.kind === "sign-up-phone") {
      await setActiveSignUp?.({ session: sessionId });
    } else {
      await setActiveSignIn?.({ session: sessionId });
    }

    router.push("/");
  };

  const handleSignInWithPassword = async () => {
    if (!isSignInLoaded || !signIn) {
      return;
    }

    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      const result = await signIn.create({
        strategy: "password",
        identifier: identifier.trim(),
        password,
      });

      if (result.status !== "complete") {
        throw new Error(
          "This account needs another verification method. Use code sign-in instead.",
        );
      }

      await finalizeSession(result.createdSessionId);
    } catch (caughtError) {
      setError(
        getClerkErrorMessage(
          caughtError,
          "We couldn't sign you in with that password.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartCodeSignIn = async () => {
    if (!isSignInLoaded || !signIn) {
      return;
    }

    const trimmedIdentifier = identifier.trim();
    const strategy = isLikelyEmail(trimmedIdentifier) ? "email_code" : "phone_code";

    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      await signIn.create({
        strategy,
        identifier: trimmedIdentifier,
      });

      setPendingStep({
        kind: "sign-in-code",
        strategy,
        destination: trimmedIdentifier,
        destinationLabel: formatDestinationLabel(trimmedIdentifier),
      });
      setVerificationCode("");
      setNotice(
        strategy === "email_code"
          ? "Verification code sent. Check your inbox."
          : "Verification code sent. Check your phone.",
      );
    } catch (caughtError) {
      setError(
        getClerkErrorMessage(
          caughtError,
          "We couldn't send a verification code.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifySignInCode = async () => {
    if (!isSignInLoaded || !signIn || pendingStep?.kind !== "sign-in-code") {
      return;
    }

    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: pendingStep.strategy,
        code: verificationCode.trim(),
      });

      if (result.status !== "complete") {
        throw new Error("That code wasn't accepted. Request a new one and try again.");
      }

      await finalizeSession(result.createdSessionId);
    } catch (caughtError) {
      setError(
        getClerkErrorMessage(
          caughtError,
          "We couldn't verify that sign-in code.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartSignUp = async () => {
    if (!isSignUpLoaded || !signUp) {
      return;
    }

    const trimmedIdentifier = identifier.trim();
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      const payload =
        signUpContactMethod === "email"
          ? {
              firstName: trimmedFirstName,
              lastName: trimmedLastName,
              emailAddress: trimmedIdentifier,
              password,
            }
          : {
              firstName: trimmedFirstName,
              lastName: trimmedLastName,
              phoneNumber: trimmedIdentifier,
              ...(password.trim().length > 0 ? { password } : {}),
            };

      await signUp.create(payload);

      if (signUpContactMethod === "email") {
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
        setPendingStep({
          kind: "sign-up-email",
          destination: trimmedIdentifier,
          destinationLabel: formatDestinationLabel(trimmedIdentifier),
        });
        setNotice("Verification code sent. Check your email to finish sign-up.");
      } else {
        await signUp.preparePhoneNumberVerification();
        setPendingStep({
          kind: "sign-up-phone",
          destination: trimmedIdentifier,
          destinationLabel: formatDestinationLabel(trimmedIdentifier),
        });
        setNotice("Verification code sent. Check your phone to finish sign-up.");
      }

      setVerificationCode("");
    } catch (caughtError) {
      setError(
        getClerkErrorMessage(
          caughtError,
          "We couldn't start sign-up with those details.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifySignUp = async () => {
    if (!isSignUpLoaded || !signUp || !pendingStep) {
      return;
    }

    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      const result =
        pendingStep.kind === "sign-up-phone"
          ? await signUp.attemptPhoneNumberVerification({
              code: verificationCode.trim(),
            })
          : await signUp.attemptEmailAddressVerification({
              code: verificationCode.trim(),
            });

      if (result.status !== "complete") {
        throw new Error("That verification code wasn't accepted.");
      }

      await finalizeSession(result.createdSessionId);
    } catch (caughtError) {
      setError(
        getClerkErrorMessage(
          caughtError,
          "We couldn't verify that sign-up code.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (pendingStep?.kind === "sign-in-code") {
      await handleStartCodeSignIn();
      return;
    }

    if (!isSignUpLoaded || !signUp || !pendingStep) {
      return;
    }

    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      if (pendingStep.kind === "sign-up-phone") {
        await signUp.preparePhoneNumberVerification();
        setNotice("Fresh phone verification code sent.");
      } else {
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
        setNotice("Fresh email verification code sent.");
      }
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
    <div className="w-full animate-fade-in">
      <div className="overflow-hidden rounded-[34px] border border-white/14 bg-black/30 shadow-[0_50px_140px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
        <div className="grid lg:grid-cols-[0.94fr_1.06fr]">
          <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.28),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.18),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.02))] p-6 sm:p-8 lg:border-b-0 lg:border-r">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.06)_0%,transparent_28%,transparent_72%,rgba(255,255,255,0.06)_100%)] opacity-60" />
            <div className="relative flex h-full flex-col">
              <div className="flex items-center justify-between gap-4">
                <div className="inline-flex items-center gap-3 rounded-full border border-white/12 bg-black/25 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-200">
                  <BrandMark className="w-6" theme="dark" decorative sizes="24px" />
                  Bay Area Access
                </div>
                <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-400">
                  Listen Local
                </div>
              </div>

              <div className="mt-10 max-w-md">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-200/85">
                  New Auth System
                </p>
                <h1 className="mt-4 font-serif text-[2.3rem] leading-[0.92] tracking-[-0.045em] text-white sm:text-[3.1rem]">
                  Local music deserves an entrance with some character.
                </h1>
                <p className="mt-5 max-w-sm text-sm leading-6 text-zinc-200/82">
                  {authSubtitle}
                </p>
              </div>

              <div className="mt-8 grid gap-3 text-left sm:grid-cols-3 lg:mt-auto">
                <div className="rounded-[22px] border border-white/12 bg-black/20 p-4">
                  <Sparkles className="h-4 w-4 text-blue-200" />
                  <p className="mt-3 text-lg font-semibold text-white">Custom shell</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-300">
                    Styled as part of EarPlug, not a third-party widget.
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/12 bg-black/20 p-4">
                  <ShieldCheck className="h-4 w-4 text-amber-200" />
                  <p className="mt-3 text-lg font-semibold text-white">Same auth core</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-300">
                    Clerk still handles sessions, OAuth, and verification.
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/12 bg-black/20 p-4">
                  <MessageSquareQuote className="h-4 w-4 text-emerald-200" />
                  <p className="mt-3 text-lg font-semibold text-white">Made for scene regulars</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-300">
                    Password, code, and social paths all live in one surface.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-[linear-gradient(180deg,rgba(7,10,17,0.92),rgba(10,10,12,0.96))] p-6 sm:p-8">
            <div className="mx-auto max-w-xl">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onModeChange("sign-up")}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                    mode === "sign-up"
                      ? "bg-white text-zinc-950"
                      : "bg-white/[0.06] text-zinc-300 hover:bg-white/[0.1]",
                  )}
                >
                  Create account
                </button>
                <button
                  type="button"
                  onClick={() => onModeChange("sign-in")}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                    mode === "sign-in"
                      ? "bg-white text-zinc-950"
                      : "bg-white/[0.06] text-zinc-300 hover:bg-white/[0.1]",
                  )}
                >
                  Sign in
                </button>
              </div>

              <div className="mt-6">
                <h2 className="font-serif text-[2rem] tracking-[-0.04em] text-white">
                  {pendingStep
                    ? "Finish verification"
                    : mode === "sign-in"
                      ? "Welcome back"
                      : "Open your account"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {pendingStep
                    ? `Enter the code sent to ${codeDestinationLabel}.`
                    : mode === "sign-in"
                      ? "Use your password, a one-time code, or a connected provider."
                      : "Sign up with email or phone, then verify once and continue."}
                </p>
              </div>

              <div className="mt-6 grid gap-2 sm:grid-cols-3">
                {SOCIAL_PROVIDERS.map(({ provider, label, eyebrow }) => (
                  <button
                    key={provider}
                    type="button"
                    onClick={() => void handleSocialAuth(provider)}
                    disabled={oauthLoadingProvider !== null}
                    className="group rounded-[22px] border border-white/12 bg-white/[0.045] px-4 py-4 text-left transition-colors hover:border-white/25 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="inline-flex items-center gap-2 text-white">
                        {getProviderBadge(provider)}
                        <span className="text-sm font-semibold">{label}</span>
                      </div>
                      {oauthLoadingProvider === provider ? (
                        <Loader2 className="h-4 w-4 animate-spin text-zinc-300" />
                      ) : (
                        <ArrowRight className="h-4 w-4 text-zinc-500 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
                      )}
                    </div>
                    <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                      {eyebrow}
                    </p>
                  </button>
                ))}
              </div>

              <div className="my-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                  or stay manual
                </span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              {pendingStep ? (
                <div className="space-y-5">
                  <div className="rounded-[26px] border border-white/12 bg-white/[0.035] p-5">
                    <div className="flex items-center gap-3 text-sm text-zinc-300">
                      <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                      <span>Verification sent to {codeDestinationLabel}</span>
                    </div>
                    <div className="mt-5 space-y-4">
                      <AuthField
                        label="Verification Code"
                        value={verificationCode}
                        onChange={setVerificationCode}
                        placeholder="Enter the 6-digit code"
                        autoComplete="one-time-code"
                        icon={<ShieldCheck className="h-4 w-4" />}
                      />
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          onClick={() =>
                            void (
                              pendingStep.kind === "sign-in-code"
                                ? handleVerifySignInCode()
                                : handleVerifySignUp()
                            )
                          }
                          disabled={isSubmitting}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-[20px] bg-white px-4 py-3.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Verifying
                            </>
                          ) : (
                            "Verify and Continue"
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleResendCode()}
                          disabled={isSubmitting}
                          className="inline-flex items-center justify-center rounded-[20px] border border-white/12 bg-white/[0.045] px-4 py-3.5 text-sm font-semibold text-zinc-100 transition-colors hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          Resend code
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : mode === "sign-in" ? (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSignInMethod("password")}
                      className={cn(
                        "rounded-full px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-colors",
                        signInMethod === "password"
                          ? "bg-blue-400/20 text-blue-100"
                          : "bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08]",
                      )}
                    >
                      Password
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignInMethod("code")}
                      className={cn(
                        "rounded-full px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-colors",
                        signInMethod === "code"
                          ? "bg-blue-400/20 text-blue-100"
                          : "bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08]",
                      )}
                    >
                      One-time code
                    </button>
                  </div>

                  <div className="grid gap-4">
                    <AuthField
                      label="Email or Phone"
                      value={identifier}
                      onChange={setIdentifier}
                      placeholder="you@example.com or +1 415 555 0123"
                      autoComplete="username"
                      icon={
                        signInMethod === "password" ? (
                          <Mail className="h-4 w-4" />
                        ) : (
                          <Phone className="h-4 w-4" />
                        )
                      }
                    />
                    {signInMethod === "password" ? (
                      <AuthField
                        label="Password"
                        value={password}
                        onChange={setPassword}
                        placeholder="Enter your password"
                        type="password"
                        autoComplete="current-password"
                        icon={<LockKeyhole className="h-4 w-4" />}
                      />
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void (
                        signInMethod === "password"
                          ? handleSignInWithPassword()
                          : handleStartCodeSignIn()
                      )
                    }
                    disabled={isSubmitting}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-[20px] bg-white px-4 py-3.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Working
                      </>
                    ) : signInMethod === "password" ? (
                      "Sign In"
                    ) : (
                      "Send code"
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSignUpContactMethod("email")}
                      className={cn(
                        "rounded-full px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-colors",
                        signUpContactMethod === "email"
                          ? "bg-amber-300/20 text-amber-100"
                          : "bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08]",
                      )}
                    >
                      Email account
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignUpContactMethod("phone")}
                      className={cn(
                        "rounded-full px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-colors",
                        signUpContactMethod === "phone"
                          ? "bg-amber-300/20 text-amber-100"
                          : "bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08]",
                      )}
                    >
                      Phone account
                    </button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <AuthField
                      label="First Name"
                      value={firstName}
                      onChange={setFirstName}
                      placeholder="Avery"
                      autoComplete="given-name"
                    />
                    <AuthField
                      label="Last Name"
                      value={lastName}
                      onChange={setLastName}
                      placeholder="Stone"
                      autoComplete="family-name"
                    />
                  </div>

                  <div className="grid gap-4">
                    <AuthField
                      label={signUpContactMethod === "email" ? "Email" : "Phone"}
                      value={identifier}
                      onChange={setIdentifier}
                      placeholder={
                        signUpContactMethod === "email"
                          ? "you@example.com"
                          : "+1 415 555 0123"
                      }
                      autoComplete={
                        signUpContactMethod === "email" ? "email" : "tel"
                      }
                      type={signUpContactMethod === "email" ? "email" : "tel"}
                      icon={
                        signUpContactMethod === "email" ? (
                          <Mail className="h-4 w-4" />
                        ) : (
                          <Phone className="h-4 w-4" />
                        )
                      }
                    />
                    <AuthField
                      label={
                        signUpContactMethod === "phone"
                          ? "Password (Optional)"
                          : "Password"
                      }
                      value={password}
                      onChange={setPassword}
                      placeholder={
                        signUpContactMethod === "phone"
                          ? "Leave blank for a code-first account"
                          : "Choose a password"
                      }
                      type="password"
                      autoComplete="new-password"
                      icon={<LockKeyhole className="h-4 w-4" />}
                    />
                  </div>

                  <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                      Verification
                    </p>
                    <p className="mt-2 text-sm leading-6 text-zinc-300">
                      {signUpContactMethod === "email"
                        ? "Email sign-up sends a one-time verification code before the session opens."
                        : "Phone sign-up sends an SMS code. Use international format for best results."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleStartSignUp()}
                    disabled={isSubmitting}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-[20px] bg-white px-4 py-3.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Starting sign-up
                      </>
                    ) : (
                      "Continue to verification"
                    )}
                  </button>
                </div>
              )}

              {error ? (
                <div className="mt-5 rounded-[22px] border border-red-400/20 bg-red-500/8 px-4 py-3">
                  <p className="text-sm leading-6 text-red-200">{error}</p>
                </div>
              ) : null}

              {notice ? (
                <div className="mt-5 rounded-[22px] border border-emerald-400/20 bg-emerald-500/8 px-4 py-3">
                  <p className="text-sm leading-6 text-emerald-200">{notice}</p>
                </div>
              ) : null}

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() =>
                    onModeChange(mode === "sign-up" ? "sign-in" : "sign-up")
                  }
                  className="inline-flex items-center gap-2 text-sm text-zinc-300 transition-colors hover:text-white"
                >
                  {mode === "sign-up"
                    ? "Already have an account? Sign in"
                    : "Need a fresh account? Sign up"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
