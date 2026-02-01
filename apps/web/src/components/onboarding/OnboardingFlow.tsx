"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignIn, SignUp, useAuth, useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Music2, Users, ArrowRight, Headphones, Mic2 } from "lucide-react";
import type { UserRole } from "@ear-plug/shared/types";
import { cn } from "@/lib/utils";
import { useRolePersistence } from "@/hooks/useLocalStorage";

type OnboardingStep = "role" | "auth";

export function OnboardingFlow() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const [step, setStep] = useState<OnboardingStep>("role");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-up");

  // localStorage persistence for role
  const { setRole: persistRole } = useRolePersistence();

  const upsertUser = useMutation(api.users.upsertUser);
  const updateRole = useMutation(api.users.updateRole);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    // Persist role to localStorage immediately
    persistRole(role);

    if (isSignedIn) {
      // User is already signed in, update their role
      handleCompleteOnboarding(role);
    } else {
      // Move to auth step
      setStep("auth");
    }
  };

  const handleCompleteOnboarding = async (role: UserRole) => {
    try {
      if (clerkUser) {
        // Create/update user in Convex
        await upsertUser({
          clerkId: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress || "",
          name: clerkUser.fullName || clerkUser.firstName || "User",
          avatar: clerkUser.imageUrl,
        });

        // Update role in Convex (synced with localStorage)
        await updateRole({ role });

        // Ensure localStorage is synced
        persistRole(role);
      }

      // Redirect to home
      router.push("/home");
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-night">
      {/* Video Background */}
      <VideoBackground />

      {/* Content */}
      <div className="relative z-20 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-lime flex items-center justify-center">
              <Headphones className="w-6 h-6 text-night" />
            </div>
            <div>
              <span className="text-2xl font-bold text-white uppercase tracking-tight">Ear-Plug</span>
              <p className="text-lime text-xs uppercase tracking-widest font-medium">Listen Local</p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center p-6">
          {step === "role" ? (
            <RoleSelection onSelect={handleRoleSelect} />
          ) : (
            <AuthStep
              role={selectedRole!}
              mode={authMode}
              onModeChange={setAuthMode}
              onBack={() => setStep("role")}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="p-6 text-center">
          <p className="text-zinc-500 text-xs uppercase tracking-widest">
            Discover live music in the Bay Area
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
        // Autoplay failed, show fallback
        setVideoError(true);
      });
    }
  }, []);

  return (
    <div className="absolute inset-0 z-0">
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-night/80 z-10" />

      {/* Subtle noise texture overlay */}
      <div
        className="absolute inset-0 z-[11] opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Video element */}
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

      {/* Animated gradient fallback */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-1000",
          videoLoaded && !videoError ? "opacity-0" : "opacity-100"
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-violet/20 via-night to-lime/10" />
        {/* Animated orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-lime/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '0s' }} />
          <div className="absolute top-1/3 right-1/3 w-24 h-24 bg-violet/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-1/3 left-1/2 w-40 h-40 bg-lime/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>
      </div>
    </div>
  );
}

interface RoleSelectionProps {
  onSelect: (role: UserRole) => void;
}

function RoleSelection({ onSelect }: RoleSelectionProps) {
  const [hoveredRole, setHoveredRole] = useState<UserRole | null>(null);

  return (
    <div className="w-full max-w-lg animate-fade-in">
      <h1 className="text-3xl md:text-4xl font-bold text-white text-center mb-3 uppercase tracking-tight">
        How will you use<br />Ear-Plug?
      </h1>
      <p className="text-zinc-400 text-center mb-10 uppercase text-xs tracking-widest">
        Choose your experience to get started
      </p>

      <div className="space-y-4">
        {/* Fan Option */}
        <button
          onClick={() => onSelect("fan")}
          onMouseEnter={() => setHoveredRole("fan")}
          onMouseLeave={() => setHoveredRole(null)}
          className={cn(
            "w-full p-6 border-2 transition-all duration-300 group relative overflow-hidden",
            "bg-night-tertiary/60 backdrop-blur-md",
            hoveredRole === "fan"
              ? "border-lime shadow-glow-lime"
              : "border-zinc-800 hover:border-lime/50"
          )}
        >
          {/* Hover gradient */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-r from-lime/10 to-transparent transition-opacity duration-300",
            hoveredRole === "fan" ? "opacity-100" : "opacity-0"
          )} />

          <div className="relative flex items-center gap-4">
            <div className="p-3 bg-lime/10 border border-lime/30">
              <Users className="w-8 h-8 text-lime" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-xl font-bold text-white uppercase tracking-wide">
                I&apos;m a Fan
              </h3>
              <p className="text-zinc-400 text-sm mt-1">
                Discover shows, follow bands, and never miss a gig
              </p>
            </div>
            <ArrowRight
              className={cn(
                "w-6 h-6 text-zinc-600 transition-all duration-300",
                hoveredRole === "fan" && "text-lime translate-x-1"
              )}
            />
          </div>
        </button>

        {/* Musician Option */}
        <button
          onClick={() => onSelect("musician")}
          onMouseEnter={() => setHoveredRole("musician")}
          onMouseLeave={() => setHoveredRole(null)}
          className={cn(
            "w-full p-6 border-2 transition-all duration-300 group relative overflow-hidden",
            "bg-night-tertiary/60 backdrop-blur-md",
            hoveredRole === "musician"
              ? "border-violet shadow-glow-violet"
              : "border-zinc-800 hover:border-violet/50"
          )}
        >
          {/* Hover gradient */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-r from-violet/10 to-transparent transition-opacity duration-300",
            hoveredRole === "musician" ? "opacity-100" : "opacity-0"
          )} />

          <div className="relative flex items-center gap-4">
            <div className="p-3 bg-violet/10 border border-violet/30">
              <Mic2 className="w-8 h-8 text-violet" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-xl font-bold text-white uppercase tracking-wide">
                I&apos;m a Musician
              </h3>
              <p className="text-zinc-400 text-sm mt-1">
                Promote shows, find gigs, and grow your fanbase
              </p>
            </div>
            <ArrowRight
              className={cn(
                "w-6 h-6 text-zinc-600 transition-all duration-300",
                hoveredRole === "musician" && "text-violet translate-x-1"
              )}
            />
          </div>
        </button>
      </div>
    </div>
  );
}

interface AuthStepProps {
  role: UserRole;
  mode: "sign-in" | "sign-up";
  onModeChange: (mode: "sign-in" | "sign-up") => void;
  onBack: () => void;
}

function AuthStep({ role, mode, onModeChange, onBack }: AuthStepProps) {
  return (
    <div className="w-full max-w-md animate-fade-in">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="mb-6 text-zinc-400 hover:text-lime flex items-center gap-2 transition-colors text-sm uppercase tracking-wider"
      >
        <ArrowRight className="w-4 h-4 rotate-180" />
        <span>Back</span>
      </button>

      {/* Role Badge */}
      <div className="text-center mb-6">
        <span
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest border",
            role === "fan"
              ? "bg-lime/10 border-lime/30 text-lime"
              : "bg-violet/10 border-violet/30 text-violet"
          )}
        >
          {role === "fan" ? (
            <Users className="w-4 h-4" />
          ) : (
            <Music2 className="w-4 h-4" />
          )}
          {role === "fan" ? "Joining as Fan" : "Joining as Musician"}
        </span>
      </div>

      {/* Auth Component - Glassmorphism Card */}
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
                socialButtonsBlockButton: "bg-night-secondary border-zinc-700 text-white hover:bg-night-tertiary",
                formFieldLabel: "text-zinc-400 uppercase text-xs tracking-wider",
                formFieldInput: "bg-night-secondary border-zinc-700 text-white focus:border-lime",
                formButtonPrimary: "bg-lime text-night font-bold uppercase tracking-wider hover:bg-lime-dark",
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
                socialButtonsBlockButton: "bg-night-secondary border-zinc-700 text-white hover:bg-night-tertiary",
                formFieldLabel: "text-zinc-400 uppercase text-xs tracking-wider",
                formFieldInput: "bg-night-secondary border-zinc-700 text-white focus:border-lime",
                formButtonPrimary: "bg-lime text-night font-bold uppercase tracking-wider hover:bg-lime-dark",
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

      {/* Toggle Auth Mode */}
      <div className="text-center mt-6">
        <button
          onClick={() => onModeChange(mode === "sign-up" ? "sign-in" : "sign-up")}
          className="text-zinc-400 hover:text-lime transition-colors text-sm"
        >
          {mode === "sign-up"
            ? "Already have an account? Sign in"
            : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  );
}
