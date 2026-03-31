"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SignIn, SignUp, useAuth } from "@clerk/nextjs";
import { ArrowRight, Headphones } from "lucide-react";
import { BrandMark, BrandWordmark } from "@/components/branding/BrandLogo";
import { cn } from "@/lib/utils";

const LOGIN_BACKGROUND_VIDEO_SRC = "/media/login-background.mov";
const LOGIN_BACKGROUND_POSTER_SRC = "/media/login-background-poster.png";

const AUTH_APPEARANCE = {
  variables: { colorPrimary: "#7c3aed" },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full",
    card: "w-full shadow-none bg-transparent",
    main: "w-full",
    headerTitle: "text-zinc-50",
    headerSubtitle: "text-zinc-100/90",
    form: "w-full",
    formContainer: "w-full",
    formFieldRow: "w-full",
    formFieldLabel: "text-zinc-100",
    formFieldInput:
      "w-full min-w-0 flex-1 basis-0 bg-white/30 border-white/40 text-zinc-50 placeholder:text-zinc-200 focus:border-zinc-100",
    formFieldInputGroup: "flex w-full min-w-0 items-stretch",
    formInputGroup: "flex w-full min-w-0 items-stretch",
    phoneInputBox: "flex w-full min-w-0 flex-1 items-stretch",
    formButtonPrimary:
      "bg-zinc-50 text-zinc-900 font-medium hover:bg-zinc-200",
    socialButtons: "w-full",
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
} as const;

export function OnboardingFlow({ overlay }: { overlay?: ReactNode }) {
  const { isSignedIn } = useAuth();
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-up");

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      {" "}
      <VideoBackground />{" "}
      <div className="relative z-20 min-h-screen bg-black/60">
        {" "}
        <div className="mx-auto flex min-h-screen max-w-xl flex-col px-6 py-8">
          <header className="pt-2 text-center">
            <div className="mx-auto flex w-fit flex-col items-center gap-3">
              <div className="rounded-[32px] border border-white/15 bg-black/35 px-5 py-4 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                <BrandWordmark
                  theme="dark"
                  priority
                  className="w-[12.5rem] sm:w-[14.5rem]"
                  sizes="(max-width: 640px) 200px, 232px"
                />
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-100/85 backdrop-blur-sm">
                <BrandMark
                  theme="dark"
                  decorative
                  className="w-5"
                  sizes="20px"
                />
                Listen Local
              </div>
            </div>
          </header>
          <main className="flex flex-1 items-center justify-center py-6">
            {" "}
            {!isSignedIn ? (
              <AuthCard mode={authMode} onModeChange={setAuthMode} />
            ) : null}{" "}
          </main>{" "}
          <footer className="text-center">
            <p className="text-xs text-zinc-200/80">
              EarPlug connects Bay Area fans with local shows, bands, and the
              venues around them.
            </p>{" "}
          </footer>{" "}
        </div>{" "}
      </div>{" "}
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
          poster={LOGIN_BACKGROUND_POSTER_SRC}
        >
          {" "}
          <source src={LOGIN_BACKGROUND_VIDEO_SRC} />{" "}
        </video>
      )}{" "}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-500",
          videoLoaded && !videoError ? "opacity-0" : "opacity-100",
        )}
      >
        {" "}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${LOGIN_BACKGROUND_POSTER_SRC}')` }}
        />{" "}
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
      <div className="mb-4 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-1.5 text-xs font-medium text-zinc-50 backdrop-blur-sm">
          <Headphones className="h-4 w-4" /> EarPlug Fan Access
        </span>
      </div>
      <div className="rounded-xl border border-white/30 bg-white/15 p-1 shadow-soft backdrop-blur-md">
        {" "}
        {mode === "sign-up" ? (
          <SignUp
            routing="hash"
            appearance={AUTH_APPEARANCE}
          />
        ) : (
          <SignIn
            routing="hash"
            appearance={AUTH_APPEARANCE}
          />
        )}{" "}
      </div>{" "}
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
        </button>{" "}
      </div>{" "}
    </div>
  );
}
