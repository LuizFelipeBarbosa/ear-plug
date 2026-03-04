import { useSignUp } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";

function getClerkErrorMessage(error: unknown): string {
  if (typeof error !== "object" || error === null) return "Sign-up failed. Please try again.";

  const maybeErrors = (error as { errors?: { longMessage?: string; message?: string }[] }).errors;
  if (!maybeErrors || maybeErrors.length === 0) return "Sign-up failed. Please try again.";

  return maybeErrors[0].longMessage || maybeErrors[0].message || "Sign-up failed. Please try again.";
}

type Step = "create" | "verify";

export default function SignUpScreen() {
  const router = useRouter();
  const { isLoaded, signUp, setActive } = useSignUp();

  const [step, setStep] = useState<Step>("create");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAccount = async () => {
    if (!isLoaded || pending) return;
    setPending(true);
    setError(null);

    try {
      const result = await signUp.create({
        emailAddress: email.trim(),
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/onboarding");
        return;
      }

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("verify");
    } catch (err) {
      setError(getClerkErrorMessage(err));
    } finally {
      setPending(false);
    }
  };

  const verifyCode = async () => {
    if (!isLoaded || pending) return;
    setPending(true);
    setError(null);

    try {
      const result = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (result.status !== "complete") {
        setError("Verification could not be completed. Please check the code and retry.");
        return;
      }

      await setActive({ session: result.createdSessionId });
      router.replace("/onboarding");
    } catch (err) {
      setError(getClerkErrorMessage(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-12">
        <Text className="text-3xl font-bold text-gray-900">Create Account</Text>
        <Text className="mt-2 text-sm text-gray-600">
          {step === "create" ? "Sign up with email and password." : "Enter the email verification code."}
        </Text>

        {step === "create" ? (
          <>
            <View className="mt-8 rounded-xl border border-gray-200 px-3 py-2">
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                className="text-gray-900"
              />
            </View>

            <View className="mt-3 rounded-xl border border-gray-200 px-3 py-2">
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                secureTextEntry
                className="text-gray-900"
              />
            </View>

            <TouchableOpacity
              onPress={createAccount}
              disabled={pending || !email.trim() || !password}
              className={`mt-5 rounded-xl py-3 ${
                pending || !email.trim() || !password ? "bg-blue-300" : "bg-blue-600"
              }`}
            >
              {pending ? (
                <View className="flex-row items-center justify-center">
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text className="ml-2 font-semibold text-white">Creating...</Text>
                </View>
              ) : (
                <Text className="text-center font-semibold text-white">Create Account</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View className="mt-8 rounded-xl border border-gray-200 px-3 py-2">
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="Email code"
                keyboardType="number-pad"
                autoCapitalize="none"
                className="text-gray-900"
              />
            </View>

            <TouchableOpacity
              onPress={verifyCode}
              disabled={pending || !code.trim()}
              className={`mt-5 rounded-xl py-3 ${pending || !code.trim() ? "bg-blue-300" : "bg-blue-600"}`}
            >
              {pending ? (
                <View className="flex-row items-center justify-center">
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text className="ml-2 font-semibold text-white">Verifying...</Text>
                </View>
              ) : (
                <Text className="text-center font-semibold text-white">Verify Email</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setStep("create");
                setCode("");
                setError(null);
              }}
              className="mt-2 rounded-xl border border-gray-200 py-3"
            >
              <Text className="text-center font-semibold text-gray-700">Back</Text>
            </TouchableOpacity>
          </>
        )}

        {error ? <Text className="mt-3 text-sm text-red-600">{error}</Text> : null}

        <View className="mt-6 flex-row items-center justify-center">
          <Text className="text-sm text-gray-600">Already have an account?</Text>
          <Link href="/sign-in" asChild>
            <TouchableOpacity className="ml-2">
              <Text className="text-sm font-semibold text-blue-700">Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}
