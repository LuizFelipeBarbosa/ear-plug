import { useSSO, useSignIn, useSignUp } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type AuthMode = "sign-in" | "sign-up";
type PhoneStep = "phone" | "code";
type PendingAction = "phone" | "google" | "apple" | null;

interface PhoneAndSocialAuthScreenProps {
  mode: AuthMode;
}

function getClerkErrorMessage(error: unknown): string {
  if (typeof error !== "object" || error === null) return "We couldn't complete that sign-in. Please try again.";

  const maybeErrors = (error as { errors?: { longMessage?: string; message?: string }[] }).errors;
  if (!maybeErrors || maybeErrors.length === 0) {
    return "We couldn't complete that sign-in. Please try again.";
  }

  return maybeErrors[0].longMessage || maybeErrors[0].message || "We couldn't complete that sign-in. Please try again.";
}

function normalizePhoneNumber(rawValue: string): string | null {
  const trimmed = rawValue.trim();

  if (trimmed.startsWith("+")) {
    const digits = trimmed.slice(1).replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) return null;
    return `+${digits}`;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;

  return null;
}

function isPhoneFactor(
  factor: { strategy: string } | null | undefined,
): factor is { strategy: "phone_code"; phoneNumberId: string; safeIdentifier: string } {
  return Boolean(
    factor &&
      factor.strategy === "phone_code" &&
      "phoneNumberId" in factor &&
      typeof factor.phoneNumberId === "string",
  );
}

function AuthButton({
  label,
  onPress,
  disabled,
  busy,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
  busy: boolean;
  variant?: "primary" | "secondary";
}) {
  const isPrimary = variant === "primary";

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      disabled={disabled}
      onPress={onPress}
      className={`mt-3 rounded-2xl border px-4 py-4 ${
        isPrimary
          ? disabled
            ? "border-blue-300 bg-blue-300"
            : "border-blue-600 bg-blue-600"
          : disabled
            ? "border-zinc-300 bg-zinc-100"
            : "border-zinc-300 bg-white"
      }`}
    >
      <View className="flex-row items-center justify-center">
        {busy ? (
          <ActivityIndicator size="small" color={isPrimary ? "#ffffff" : "#111827"} />
        ) : null}
        <Text className={`${busy ? "ml-2" : ""} text-center text-base font-semibold ${isPrimary ? "text-white" : "text-zinc-900"}`}>
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export function PhoneAndSocialAuthScreen({ mode }: PhoneAndSocialAuthScreenProps) {
  const router = useRouter();
  const { isLoaded: signInLoaded, signIn, setActive: setActiveSignIn } = useSignIn();
  const { isLoaded: signUpLoaded, signUp, setActive: setActiveSignUp } = useSignUp();
  const { startSSOFlow } = useSSO();

  const [step, setStep] = useState<PhoneStep>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [normalizedPhoneNumber, setNormalizedPhoneNumber] = useState("");
  const [verificationTarget, setVerificationTarget] = useState("");
  const [code, setCode] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [error, setError] = useState<string | null>(null);

  const isSignIn = mode === "sign-in";
  const title = isSignIn ? "Sign In" : "Create Account";
  const subtitle = isSignIn
    ? "Use the same Clerk account you use on web. Phone, Google, and Apple all land in the same account."
    : "Create your Ear-Plug account with a phone number, Google, or Apple, then create bands from your profile.";
  const ctaLabel = isSignIn ? "Send Sign-In Code" : "Text Me a Code";
  const successPath = "/(tabs)";
  const alternateHref = isSignIn ? "/sign-up" : "/sign-in";
  const alternateLabel = isSignIn ? "Need an account?" : "Already have an account?";
  const alternateActionLabel = isSignIn ? "Create One" : "Sign In";
  const socialIntro = isSignIn ? "Or continue with" : "Or create your account with";
  const canSubmitPhone = useMemo(() => normalizePhoneNumber(phoneNumber) !== null, [phoneNumber]);
  const canSubmitCode = code.trim().length >= 6;
  const isBusy = pendingAction !== null;
  const isLoaded = signInLoaded && signUpLoaded;

  const finishAuth = async (sessionId: string | null, activate: ((params: { session: string }) => Promise<void>) | undefined) => {
    if (!sessionId || !activate) {
      throw new Error("Clerk did not return an active session.");
    }

    await activate({ session: sessionId });
    router.replace(successPath);
  };

  const handlePhoneStart = async () => {
    if (!isLoaded || isBusy) return;

    const normalized = normalizePhoneNumber(phoneNumber);
    if (!normalized) {
      setError("Enter a valid phone number. US numbers can omit the country code; international numbers should include +country code.");
      return;
    }

    setError(null);
    setPendingAction("phone");

    try {
      if (isSignIn) {
        if (!signIn || !setActiveSignIn) {
          throw new Error("Clerk sign-in is still loading.");
        }

        const result = await signIn.create({
          strategy: "phone_code",
          identifier: normalized,
        });

        if (result.status === "complete") {
          await finishAuth(result.createdSessionId, setActiveSignIn);
          return;
        }

        const phoneFactor = result.supportedFirstFactors?.find(isPhoneFactor);
        if (!phoneFactor) {
          setError("This phone number is not ready for sign-in. Create an account first, or use Google or Apple.");
          return;
        }

        await signIn.prepareFirstFactor({
          strategy: "phone_code",
          phoneNumberId: phoneFactor.phoneNumberId,
        });

        setVerificationTarget(phoneFactor.safeIdentifier || normalized);
      } else {
        if (!signUp || !setActiveSignUp) {
          throw new Error("Clerk sign-up is still loading.");
        }

        const result = await signUp.create({
          phoneNumber: normalized,
        });

        if (result.status === "complete") {
          await finishAuth(result.createdSessionId, setActiveSignUp);
          return;
        }

        await signUp.preparePhoneNumberVerification({
          strategy: "phone_code",
        });

        setVerificationTarget(normalized);
      }

      setNormalizedPhoneNumber(normalized);
      setCode("");
      setStep("code");
    } catch (err) {
      setError(getClerkErrorMessage(err));
    } finally {
      setPendingAction(null);
    }
  };

  const handlePhoneVerify = async () => {
    if (!isLoaded || isBusy || !canSubmitCode) return;

    setError(null);
    setPendingAction("phone");

    try {
      if (isSignIn) {
        if (!signIn || !setActiveSignIn) {
          throw new Error("Clerk sign-in is still loading.");
        }

        const result = await signIn.attemptFirstFactor({
          strategy: "phone_code",
          code: code.trim(),
        });

        if (result.status !== "complete") {
          setError("That code did not complete sign-in. Check the SMS and try again.");
          return;
        }

        await finishAuth(result.createdSessionId, setActiveSignIn);
      } else {
        if (!signUp || !setActiveSignUp) {
          throw new Error("Clerk sign-up is still loading.");
        }

        const result = await signUp.attemptPhoneNumberVerification({
          code: code.trim(),
        });

        if (result.status !== "complete") {
          setError("That code did not complete account creation. Check the SMS and try again.");
          return;
        }

        await finishAuth(result.createdSessionId, setActiveSignUp);
      }
    } catch (err) {
      setError(getClerkErrorMessage(err));
    } finally {
      setPendingAction(null);
    }
  };

  const handleBackToPhone = () => {
    if (isBusy) return;
    setCode("");
    setError(null);
    setStep("phone");
  };

  const handleSocialAuth = async (provider: "google" | "apple") => {
    if (isBusy) return;

    setError(null);
    setPendingAction(provider);

    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: provider === "google" ? "oauth_google" : "oauth_apple",
      });

      await finishAuth(createdSessionId, setActive);
    } catch (err) {
      setError(getClerkErrorMessage(err));
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f4efe6]">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          className="flex-1"
        >
          <View className="relative flex-1 overflow-hidden px-6 py-8">
            <View className="absolute -left-10 top-0 h-44 w-44 rounded-full bg-[#2f6fed]/12" />
            <View className="absolute right-0 top-24 h-56 w-56 rounded-full bg-[#ff7a59]/14" />
            <View className="absolute bottom-12 left-16 h-32 w-32 rounded-full bg-[#0d3b66]/8" />

            <View className="rounded-[28px] border border-[#d6c8b3] bg-[#fbf8f3] px-5 py-4">
              <Text className="text-xs font-semibold uppercase tracking-[3px] text-[#9d5c3f]">Ear-Plug Access</Text>
              <Text className="mt-3 text-4xl font-bold leading-tight text-[#111827]">{title}</Text>
              <Text className="mt-3 text-sm leading-6 text-[#5b5f69]">{subtitle}</Text>

              <View className="mt-6 rounded-3xl border border-[#e5ddcf] bg-white px-4 py-5">
                <Text className="text-xs font-semibold uppercase tracking-[2px] text-[#5f6b7a]">
                  {step === "phone" ? "Phone number" : "Verification code"}
                </Text>

                {step === "phone" ? (
                  <>
                    <TextInput
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      placeholder="+1 415 555 0199"
                      placeholderTextColor="#8f95a3"
                      keyboardType="phone-pad"
                      textContentType="telephoneNumber"
                      autoComplete="tel"
                      autoCapitalize="none"
                      className="mt-4 rounded-2xl border border-[#d9dde7] bg-[#f7f9fc] px-4 py-4 text-base font-medium text-[#111827]"
                    />
                    <Text className="mt-3 text-sm leading-5 text-[#667085]">
                      Use the phone number attached to your Clerk account. US numbers can skip the country code.
                    </Text>
                    <AuthButton
                      label={pendingAction === "phone" ? (isSignIn ? "Sending..." : "Requesting code...") : ctaLabel}
                      onPress={handlePhoneStart}
                      disabled={!canSubmitPhone || isBusy}
                      busy={pendingAction === "phone"}
                    />
                  </>
                ) : (
                  <>
                    <Text className="mt-4 text-sm leading-5 text-[#475467]">
                      We texted a code to <Text className="font-semibold text-[#111827]">{verificationTarget || normalizedPhoneNumber}</Text>.
                    </Text>
                    <TextInput
                      value={code}
                      onChangeText={setCode}
                      placeholder="6-digit code"
                      placeholderTextColor="#8f95a3"
                      keyboardType="number-pad"
                      textContentType="oneTimeCode"
                      autoComplete="sms-otp"
                      className="mt-4 rounded-2xl border border-[#d9dde7] bg-[#f7f9fc] px-4 py-4 text-base font-medium tracking-[6px] text-[#111827]"
                    />
                    <AuthButton
                      label={pendingAction === "phone" ? "Verifying..." : isSignIn ? "Verify and Sign In" : "Verify and Create Account"}
                      onPress={handlePhoneVerify}
                      disabled={!canSubmitCode || isBusy}
                      busy={pendingAction === "phone"}
                    />
                    <AuthButton
                      label="Use a different number"
                      onPress={handleBackToPhone}
                      disabled={isBusy}
                      busy={false}
                      variant="secondary"
                    />
                  </>
                )}

                {error ? (
                  <View className="mt-4 rounded-2xl border border-[#f4b8a8] bg-[#fff1eb] px-4 py-3">
                    <Text className="text-sm leading-5 text-[#8e2f16]">{error}</Text>
                  </View>
                ) : null}
              </View>

              <View className="mt-6 flex-row items-center">
                <View className="h-px flex-1 bg-[#d9d0c1]" />
                <Text className="mx-3 text-xs font-semibold uppercase tracking-[2px] text-[#7a7f89]">{socialIntro}</Text>
                <View className="h-px flex-1 bg-[#d9d0c1]" />
              </View>

              <AuthButton
                label={pendingAction === "google" ? "Connecting Google..." : "Continue with Google"}
                onPress={() => handleSocialAuth("google")}
                disabled={isBusy}
                busy={pendingAction === "google"}
                variant="secondary"
              />
              <AuthButton
                label={pendingAction === "apple" ? "Connecting Apple..." : "Continue with Apple"}
                onPress={() => handleSocialAuth("apple")}
                disabled={isBusy}
                busy={pendingAction === "apple"}
                variant="secondary"
              />

              <View className="mt-6 rounded-2xl bg-[#101828] px-4 py-4">
                <Text className="text-xs font-semibold uppercase tracking-[2px] text-[#facc15]">Note</Text>
                <Text className="mt-2 text-sm leading-6 text-[#e5e7eb]">
                  Sign in as a fan, then create and manage bands from your profile workspace menu.
                </Text>
              </View>

              <View className="mt-6 flex-row items-center justify-center">
                <Text className="text-sm text-[#5b5f69]">{alternateLabel}</Text>
                <Link href={alternateHref} asChild>
                  <TouchableOpacity className="ml-2" activeOpacity={0.85}>
                    <Text className="text-sm font-semibold text-[#2f6fed]">{alternateActionLabel}</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
