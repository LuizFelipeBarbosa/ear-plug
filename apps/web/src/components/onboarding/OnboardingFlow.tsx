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

    syncAndRedirect();
  }, [isSignedIn, clerkUser, upsertUser, router]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-night">
      <VideoBackground />

      <div className="relative z-20 min-h-screen flex flex-col">
        <header className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-lime flex items-center justify-center">
              <Headphones className="w-6 h-6 text-night" />
            </div>
            <div>
              <span className="text-2xl font-bold text-white uppercase tracking-tight">
                Ear-Plug
              </span>
              <p className="text-lime text-xs uppercase tracking-widest font-medium">
                Listen Local
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <AuthCard mode={authMode} onModeChange={setAuthMode} />
        </main>

        <footer className="p-6 text-center">
          <p className="text-zinc-500 text-xs uppercase tracking-widest">
            Sign in as a fan, then create and manage bands from your profile
          </p>
        </footer>
      </div>
    </div>
  );
}

function VideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {
        setVideoError(true);
      });
    }
  }, []);

  return (
    <div className="absolute inset-0 z-0">
      <div className="absolute inset-0 bg-night/80 z-10" />
      <div
        className="absolute inset-0 z-[11] opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
        }}
      />

      {!videoError && (
        <video
          ref={videoRef}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-1000",
            videoLoaded ? "opacity-100" : "opacity-0"
          )}
          autoPlay
          muted
          loop
          playsInline
          onLoadedData={() => setVideoLoaded(true)}
          onError={() => setVideoError(true)}
          poster="/images/concert-poster.jpg"
        >
          <source
            src="https://assets.mixkit.co/videos/preview/mixkit-people-at-a-concert-seen-from-behind-4684-large.mp4"
            type="video/mp4"
          />
          <source
            src="https://assets.mixkit.co/videos/preview/mixkit-people-at-a-concert-seen-from-behind-4684-large.webm"
            type="video/webm"
          />
        </video>
      )}

      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-1000",
          videoLoaded && !videoError ? "opacity-0" : "opacity-100"
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-violet/20 via-night to-lime/10" />
      </div>
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
      <div className="text-center mb-6">
        <span className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest border bg-lime/10 border-lime/30 text-lime">
          <Headphones className="w-4 h-4" />
          Join as Fan
        </span>
      </div>

      <div className="bg-night-tertiary/80 backdrop-blur-xl border-2 border-zinc-800 p-1 shadow-2xl">
        {mode === "sign-up" ? (
          <SignUp
            routing="hash"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none bg-transparent",
                headerTitle: "text-white uppercase tracking-tight",
                headerSubtitle: "text-zinc-400",
                socialButtonsBlockButton:
                  "bg-night-secondary border-zinc-700 text-white hover:bg-night-tertiary",
                formFieldLabel: "text-zinc-400 uppercase text-xs tracking-wider",
                formFieldInput:
                  "bg-night-secondary border-zinc-700 text-white focus:border-lime",
                formButtonPrimary:
                  "bg-lime text-night font-bold uppercase tracking-wider hover:bg-lime-dark",
                footerActionLink: "text-lime hover:text-lime-dark",
                dividerLine: "bg-zinc-700",
                dividerText: "text-zinc-500",
                identityPreview: "bg-night-secondary border-zinc-700",
                identityPreviewText: "text-white",
                identityPreviewEditButton: "text-lime",
                formFieldSuccessText: "text-lime",
                formFieldErrorText: "text-red-500",
                alert: "bg-red-500/10 border-red-500/30 text-red-400",
                alertText: "text-red-400",
              },
            }}
            afterSignUpUrl="/home"
          />
        ) : (
          <SignIn
            routing="hash"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none bg-transparent",
                headerTitle: "text-white uppercase tracking-tight",
                headerSubtitle: "text-zinc-400",
                socialButtonsBlockButton:
                  "bg-night-secondary border-zinc-700 text-white hover:bg-night-tertiary",
                formFieldLabel: "text-zinc-400 uppercase text-xs tracking-wider",
                formFieldInput:
                  "bg-night-secondary border-zinc-700 text-white focus:border-lime",
                formButtonPrimary:
                  "bg-lime text-night font-bold uppercase tracking-wider hover:bg-lime-dark",
                footerActionLink: "text-lime hover:text-lime-dark",
                dividerLine: "bg-zinc-700",
                dividerText: "text-zinc-500",
                identityPreview: "bg-night-secondary border-zinc-700",
                identityPreviewText: "text-white",
                identityPreviewEditButton: "text-lime",
                formFieldSuccessText: "text-lime",
                formFieldErrorText: "text-red-500",
                alert: "bg-red-500/10 border-red-500/30 text-red-400",
                alertText: "text-red-400",
              },
            }}
            afterSignInUrl="/home"
          />
        )}
      </div>

      <div className="text-center mt-6">
        <button
          onClick={() => onModeChange(mode === "sign-up" ? "sign-in" : "sign-up")}
          className="text-zinc-400 hover:text-lime transition-colors text-sm inline-flex items-center gap-1.5"
        >
          {mode === "sign-up"
            ? "Already have an account? Sign in"
            : "Don't have an account? Sign up"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
