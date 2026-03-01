"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SignIn, SignUp, useAuth, useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { ArrowRight, Headphones } from "lucide-react";
import { cn } from "@/lib/utils";
export function OnboardingFlow() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const upsertUser = useMutation(api.users.upsertUser);
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-up");
  useEffect(() => {
    async function syncAndRedirect() {
      if (!isSignedIn || !clerkUser) return;
      try {
        await upsertUser({
          clerkId: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress || "",
          phoneNumber: clerkUser.primaryPhoneNumber?.phoneNumber,
          name: clerkUser.fullName || clerkUser.firstName || "User",
          avatar: clerkUser.imageUrl,
        });
      } catch (error) {
        console.error("Failed to sync user", error);
      } finally {
        router.push("/home");
      }
    }
    void syncAndRedirect();
  }, [isSignedIn, clerkUser, upsertUser, router]);
  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      {" "}
      <VideoBackground />{" "}
      <div className="relative z-20 min-h-screen bg-black/60">
        {" "}
        <div className="mx-auto flex min-h-screen max-w-xl flex-col px-6 py-8">
          {" "}
          <header className="pt-2 text-center">
            {" "}
            <p className="text-[11px] tracking-[0.2em] text-zinc-200/90">
              Listen Local
            </p>{" "}
            <h1 className="mt-1 text-5xl font-semibold text-zinc-50">
              EAR-PLUG
            </h1>{" "}
          </header>{" "}
          <main className="flex flex-1 items-center justify-center py-6">
            {" "}
            <AuthCard mode={authMode} onModeChange={setAuthMode} />{" "}
          </main>{" "}
          <footer className="text-center">
            {" "}
            <p className="text-xs text-zinc-200/80">
              {" "}
              Sign in as a fan, then create and manage bands from your
              profile.{" "}
            </p>{" "}
          </footer>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
function VideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => {
      setVideoError(true);
    });
  }, []);
  return (
    <div className="absolute inset-0 z-0">
      {" "}
      {!videoError && (
        <video
          ref={videoRef}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
            videoLoaded ? "opacity-100" : "opacity-0",
          )}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onLoadedData={() => setVideoLoaded(true)}
          onError={() => setVideoError(true)}
          poster="/media/onboarding-poster.jpg"
        >
          {" "}
          <source src="/media/onboarding-loop.mp4" type="video/mp4" />{" "}
        </video>
      )}{" "}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-500",
          videoLoaded && !videoError ? "opacity-0" : "opacity-100",
        )}
      >
        {" "}
        <div className="absolute inset-0 bg-[url('/media/onboarding-poster.jpg')] bg-cover bg-center" />{" "}
      </div>{" "}
      <div className="absolute inset-0 bg-black/60" />{" "}
    </div>
  );
}
function AuthCard({
  mode,
  onModeChange,
}: {
  mode: "sign-in" | "sign-up";
  onModeChange: (mode: "sign-in" | "sign-up") => void;
}) {
  return (
    <div className="w-full max-w-md animate-fade-in">
      {" "}
      <div className="mb-4 text-center">
        {" "}
        <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-1.5 text-xs font-medium text-zinc-50 backdrop-blur-sm">
          {" "}
          <Headphones className="h-4 w-4" /> Join as Fan{" "}
        </span>{" "}
      </div>{" "}
      <div className="rounded-xl border border-white/30 bg-white/15 p-1 shadow-soft backdrop-blur-md">
        {" "}
        {mode === "sign-up" ? (
          <SignUp
            routing="hash"
            appearance={{
              variables: { colorPrimary: "#7c3aed" },
              elements: {
                rootBox: "w-full",
                card: "shadow-none bg-transparent",
                headerTitle: "text-zinc-50",
                headerSubtitle: "text-zinc-100/90",
                formFieldLabel: "text-zinc-100",
                formFieldInput:
                  "bg-white/30 border-white/40 text-zinc-50 placeholder:text-zinc-200 focus:border-zinc-100",
                formButtonPrimary:
                  "bg-zinc-50 text-zinc-900 font-medium hover:bg-zinc-200",
                socialButtonsBlockButton:
                  "bg-white/30 border-white/40 text-zinc-50 hover:bg-white/40",
                footerActionLink: "text-zinc-50 hover:text-zinc-200",
                dividerLine: "bg-white/30",
                dividerText: "text-zinc-200",
                identityPreview: "bg-white/20 border-white/30",
                identityPreviewText: "text-zinc-50",
                identityPreviewEditButton: "text-zinc-50",
                formFieldSuccessText: "text-green-200",
                formFieldErrorText: "text-red-200",
                alert: "bg-red-500/20 border-red-200/40 text-red-100",
                alertText: "text-red-100",
              },
            }}
            afterSignUpUrl="/home"
          />
        ) : (
          <SignIn
            routing="hash"
            appearance={{
              variables: { colorPrimary: "#7c3aed" },
              elements: {
                rootBox: "w-full",
                card: "shadow-none bg-transparent",
                headerTitle: "text-zinc-50",
                headerSubtitle: "text-zinc-100/90",
                formFieldLabel: "text-zinc-100",
                formFieldInput:
                  "bg-white/30 border-white/40 text-zinc-50 placeholder:text-zinc-200 focus:border-zinc-100",
                formButtonPrimary:
                  "bg-zinc-50 text-zinc-900 font-medium hover:bg-zinc-200",
                socialButtonsBlockButton:
                  "bg-white/30 border-white/40 text-zinc-50 hover:bg-white/40",
                footerActionLink: "text-zinc-50 hover:text-zinc-200",
                dividerLine: "bg-white/30",
                dividerText: "text-zinc-200",
                identityPreview: "bg-white/20 border-white/30",
                identityPreviewText: "text-zinc-50",
                identityPreviewEditButton: "text-zinc-50",
                formFieldSuccessText: "text-green-200",
                formFieldErrorText: "text-red-200",
                alert: "bg-red-500/20 border-red-200/40 text-red-100",
                alertText: "text-red-100",
              },
            }}
            afterSignInUrl="/home"
          />
        )}{" "}
      </div>{" "}
      <div className="mt-5 text-center">
        {" "}
        <button
          type="button"
          onClick={() =>
            onModeChange(mode === "sign-up" ? "sign-in" : "sign-up")
          }
          className="inline-flex items-center gap-1.5 text-sm text-zinc-100 hover:text-zinc-50"
        >
          {" "}
          {mode === "sign-up"
            ? "Already have an account? Sign in"
            : "Don't have an account? Sign up"}{" "}
          <ArrowRight className="h-4 w-4" />{" "}
        </button>{" "}
      </div>{" "}
    </div>
  );
}
