import { useRouter } from "expo-router";
import { useEffect } from "react";
import { AppScreen, LoadingPanel } from "@/components/ui/AppPrimitives";

export default function SSOCallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    // Clerk's SSO flow resolves in the hook that launched the browser session.
    // If the router lands here directly, move the user back to the auth shell.
    router.replace("/sign-in");
  }, [router]);

  return (
    <AppScreen>
      <LoadingPanel label="Completing sign in..." tone="fan" />
    </AppScreen>
  );
}
