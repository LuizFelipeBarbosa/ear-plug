import { useSignIn } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";

function getClerkErrorMessage(error: unknown): string {
  if (typeof error !== "object" || error === null) return "Sign-in failed. Please try again.";

  const maybeErrors = (error as { errors?: { longMessage?: string; message?: string }[] }).errors;
  if (!maybeErrors || maybeErrors.length === 0) return "Sign-in failed. Please try again.";

  return maybeErrors[0].longMessage || maybeErrors[0].message || "Sign-in failed. Please try again.";
}

export default function SignInScreen() {
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!isLoaded || pending) return;
    setError(null);
    setPending(true);

    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password,
      });

      if (result.status !== "complete") {
        setError("Additional verification is required. Use email/password sign-in.");
        return;
      }

      await setActive({ session: result.createdSessionId });
      router.replace("/");
    } catch (err) {
      setError(getClerkErrorMessage(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-12">
        <Text className="text-3xl font-bold text-gray-900">Sign In</Text>
        <Text className="mt-2 text-sm text-gray-600">Access your Ear-Plug account.</Text>

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

        {error ? <Text className="mt-3 text-sm text-red-600">{error}</Text> : null}

        <TouchableOpacity
          onPress={onSubmit}
          disabled={pending || !email.trim() || !password}
          className={`mt-5 rounded-xl py-3 ${
            pending || !email.trim() || !password ? "bg-blue-300" : "bg-blue-600"
          }`}
        >
          {pending ? (
            <View className="flex-row items-center justify-center">
              <ActivityIndicator size="small" color="#ffffff" />
              <Text className="ml-2 font-semibold text-white">Signing in...</Text>
            </View>
          ) : (
            <Text className="text-center font-semibold text-white">Sign In</Text>
          )}
        </TouchableOpacity>

        <View className="mt-6 flex-row items-center justify-center">
          <Text className="text-sm text-gray-600">No account yet?</Text>
          <Link href="/sign-up" asChild>
            <TouchableOpacity className="ml-2">
              <Text className="text-sm font-semibold text-blue-700">Sign Up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}
