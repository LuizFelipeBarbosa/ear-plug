"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SignIn, SignUp, useAuth } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import { WEB_AUTH_CLERK_APPEARANCE } from "@/components/auth/clerkAppearance";
import { BrandWordmark } from "@/components/branding/BrandLogo";
import { cn } from "@/lib/utils";

const LOGIN_BACKGROUND_VIDEO_SRC = "/media/login-background.mov";
const LOGIN_BACKGROUND_POSTER_SRC = "/media/login-background-poster.png";

export function OnboardingFlow({ overlay }: { overlay?: ReactNode }) {
  const { isSignedIn } = useAuth();
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-up");

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <VideoBackground />
      <div className="relative z-20 min-h-screen bg-black/60">
        <div className="mx-auto flex min-h-screen max-w-xl flex-col px-6 py-8">
          <header className="pt-2 text-center">
            <div className="mx-auto flex w-fit flex-col items-center">
              <div className="rounded-[28px] border border-white/15 bg-black/35 px-4 py-3 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                <BrandWordmark
                  theme="dark"
                  priority
                  className="w-[9.5rem] sm:w-[11.5rem]"
                  sizes="(max-width: 640px) 152px, 184px"
                />
              </div>
            </div>
          </header>
          <main className="flex flex-1 items-center justify-center py-6">
            {!isSignedIn ? (
              <AuthCard mode={authMode} onModeChange={setAuthMode} />
            ) : null}
          </main>
          <footer className="text-center">
            <p className="text-xs text-zinc-200/80">
              EarPlug connects Bay Area fans with local shows, bands, and the
              venues around them.
            </p>
          </footer>
        </div>
      </div>
      {overlay}
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
          poster={LOGIN_BACKGROUND_POSTER_SRC}
        >
          <source src={LOGIN_BACKGROUND_VIDEO_SRC} />
        </video>
      )}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-500",
          videoLoaded && !videoError ? "opacity-0" : "opacity-100",
        )}
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${LOGIN_BACKGROUND_POSTER_SRC}')` }}
        />
      </div>
      <div className="absolute inset-0 bg-black/60" />
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
      <div className="rounded-[30px] border border-white/18 bg-black/28 p-2.5 shadow-[0_36px_100px_rgba(0,0,0,0.52)] backdrop-blur-2xl sm:p-3">
        <div className="rounded-[24px] border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.03] px-4 py-5 sm:px-5 sm:py-6">
          {mode === "sign-up" ? (
            <SignUp routing="hash" appearance={WEB_AUTH_CLERK_APPEARANCE} />
          ) : (
            <SignIn routing="hash" appearance={WEB_AUTH_CLERK_APPEARANCE} />
          )}
        </div>
      </div>
      <div className="mt-5 text-center">
        <button
          type="button"
          onClick={() =>
            onModeChange(mode === "sign-up" ? "sign-in" : "sign-up")
          }
          className="inline-flex items-center gap-1.5 text-sm text-zinc-100 hover:text-zinc-50"
        >
          {mode === "sign-up"
            ? "Already have an account? Sign in"
            : "Don't have an account? Sign up"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
