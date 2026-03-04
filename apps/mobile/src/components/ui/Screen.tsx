import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, View } from "react-native";

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  keyboardAware?: boolean;
}

export function Screen({ children, scroll = false, padded = true, keyboardAware = false }: ScreenProps) {
  const content = scroll ? (
    <ScrollView contentContainerClassName={padded ? "p-4" : undefined}>{children}</ScrollView>
  ) : (
    <View className={padded ? "flex-1 p-4" : "flex-1"}>{children}</View>
  );

  if (keyboardAware) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          {content}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return <SafeAreaView className="flex-1 bg-white">{content}</SafeAreaView>;
}
