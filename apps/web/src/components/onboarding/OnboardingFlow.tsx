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
    <div className="min-h-screen relative overflow-hidden">
      {/* Video Background */}
      <VideoBackground />

      {/* Content */}
      <div className="relative z-20 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-6">
          <div className="flex items-center gap-2">
            <Headphones className="w-8 h-8 text-primary-400" />
            <span className="text-2xl font-bold text-white">Ear-Plug</span>
          </div>
          <p className="text-primary-200 mt-1 ml-10">Listen Local</p>
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
        <footer className="p-6 text-center text-white/50 text-sm">
          <p>Discover live music in the Bay Area</p>
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
      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80 z-10" />

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
          {/* Add your video sources here - using a free stock video as placeholder */}
          <source
            src="https://assets.mixkit.co/videos/preview/mixkit-people-at-a-concert-seen-from-behind-4684-large.mp4"
            type="video/mp4"
          />
          {/* Fallback for WebM */}
          <source
            src="https://assets.mixkit.co/videos/preview/mixkit-people-at-a-concert-seen-from-behind-4684-large.webm"
            type="video/webm"
          />
        </video>
      )}

      {/* Animated gradient fallback (shows while video loads or if video fails) */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-1000",
          videoLoaded && !videoError ? "opacity-0" : "opacity-100"
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-primary-800 to-accent-900" />
        {/* Animated overlay for visual interest */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-500/20 via-transparent to-transparent animate-pulse" />
        {/* Floating music notes effect */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-primary-400/30 rounded-full animate-float" style={{ animationDelay: '0s' }} />
          <div className="absolute top-1/3 right-1/3 w-3 h-3 bg-accent-400/30 rounded-full animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-1/3 left-1/2 w-5 h-5 bg-primary-300/20 rounded-full animate-float" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 right-1/4 w-4 h-4 bg-accent-300/25 rounded-full animate-float" style={{ animationDelay: '0.5s' }} />
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
      <h1 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
        How will you use Ear-Plug?
      </h1>
      <p className="text-white/70 text-center mb-8">
        Choose your experience to get started
      </p>

      <div className="space-y-4">
        {/* Fan Option */}
        <button
          onClick={() => onSelect("fan")}
          onMouseEnter={() => setHoveredRole("fan")}
          onMouseLeave={() => setHoveredRole(null)}
          className={cn(
            "w-full p-6 rounded-2xl border-2 transition-all duration-300",
            "bg-white/10 backdrop-blur-sm",
            "hover:bg-white/20 hover:border-primary-400 hover:scale-[1.02]",
            hoveredRole === "fan"
              ? "border-primary-400 shadow-glow"
              : "border-white/20"
          )}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary-500/20">
              <Users className="w-8 h-8 text-primary-400" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-xl font-semibold text-white">
                I&apos;m a Fan
              </h3>
              <p className="text-white/60 mt-1">
                Discover shows, follow bands, and never miss a gig
              </p>
            </div>
            <ArrowRight
              className={cn(
                "w-6 h-6 text-white/40 transition-all",
                hoveredRole === "fan" && "text-primary-400 translate-x-1"
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
            "w-full p-6 rounded-2xl border-2 transition-all duration-300",
            "bg-white/10 backdrop-blur-sm",
            "hover:bg-white/20 hover:border-accent-400 hover:scale-[1.02]",
            hoveredRole === "musician"
              ? "border-accent-400 shadow-glow"
              : "border-white/20"
          )}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-accent-500/20">
              <Mic2 className="w-8 h-8 text-accent-400" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-xl font-semibold text-white">
                I&apos;m a Musician
              </h3>
              <p className="text-white/60 mt-1">
                Promote shows, find gigs, and grow your fanbase
              </p>
            </div>
            <ArrowRight
              className={cn(
                "w-6 h-6 text-white/40 transition-all",
                hoveredRole === "musician" && "text-accent-400 translate-x-1"
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
        className="mb-6 text-white/60 hover:text-white flex items-center gap-2 transition-colors"
      >
        <ArrowRight className="w-4 h-4 rotate-180" />
        <span>Back to role selection</span>
      </button>

      {/* Role Badge */}
      <div className="text-center mb-6">
        <span
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
            role === "fan"
              ? "bg-primary-500/20 text-primary-300"
              : "bg-accent-500/20 text-accent-300"
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

      {/* Auth Component */}
      <div className="bg-white rounded-2xl p-2 shadow-xl">
        {mode === "sign-up" ? (
          <SignUp
            routing="hash"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none",
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
                card: "shadow-none",
              },
            }}
            afterSignInUrl="/home"
          />
        )}
      </div>

      {/* Toggle Auth Mode */}
      <div className="text-center mt-4">
        <button
          onClick={() => onModeChange(mode === "sign-up" ? "sign-in" : "sign-up")}
          className="text-white/60 hover:text-white transition-colors"
        >
          {mode === "sign-up"
            ? "Already have an account? Sign in"
            : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  );
}
