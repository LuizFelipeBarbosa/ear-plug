"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import {
  ArrowLeft,
  ArrowRight,
  Music,
  MapPin,
  Users,
  Link as LinkIcon,
  Check,
  Loader2,
} from "lucide-react";
import { GENRES } from "@ear-plug/shared/constants";
import type { Genre } from "@ear-plug/shared/types";
import { cn } from "@/lib/utils";

type Step = "basics" | "genre" | "details" | "social";

interface FormData {
  name: string;
  location: string;
  genre: Genre | null;
  bio: string;
  memberCount: number;
  socialLinks: {
    spotify?: string;
    appleMusic?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    website?: string;
  };
}

const STEPS: { id: Step; title: string; icon: React.ReactNode }[] = [
  { id: "basics", title: "Basics", icon: <Music className="w-4 h-4" /> },
  { id: "genre", title: "Genre", icon: <Music className="w-4 h-4" /> },
  { id: "details", title: "Details", icon: <Users className="w-4 h-4" /> },
  { id: "social", title: "Links", icon: <LinkIcon className="w-4 h-4" /> },
];

export function CreateBandForm() {
  const router = useRouter();
  const createBand = useMutation(api.bands.create);

  const [currentStep, setCurrentStep] = useState<Step>("basics");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    name: "",
    location: "",
    genre: null,
    bio: "",
    memberCount: 1,
    socialLinks: {},
  });

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  const canProceed = () => {
    switch (currentStep) {
      case "basics":
        return formData.name.trim().length > 0 && formData.location.trim().length > 0;
      case "genre":
        return formData.genre !== null;
      case "details":
        return true; // Optional step
      case "social":
        return true; // Optional step
      default:
        return false;
    }
  };

  const handleNext = () => {
    const stepIndex = STEPS.findIndex((s) => s.id === currentStep);
    if (stepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[stepIndex + 1].id);
    }
  };

  const handleBack = () => {
    const stepIndex = STEPS.findIndex((s) => s.id === currentStep);
    if (stepIndex > 0) {
      setCurrentStep(STEPS[stepIndex - 1].id);
    }
  };

  const handleSubmit = async () => {
    if (!formData.genre) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await createBand({
        name: formData.name.trim(),
        location: formData.location.trim(),
        genre: formData.genre,
        bio: formData.bio.trim() || undefined,
        memberCount: formData.memberCount || undefined,
        socialLinks: Object.keys(formData.socialLinks).length > 0 
          ? formData.socialLinks 
          : undefined,
      });

      router.push("/home");
    } catch (err: any) {
      setError(err.message || "Failed to create band. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-surface-dark">
      {/* Header */}
      <header className="bg-gradient-to-r from-accent-600 to-accent-800 text-white p-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white/80 hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <h1 className="text-2xl font-bold">Create Your Band</h1>
        <p className="text-white/70 mt-1">Set up your band profile to start booking gigs</p>
      </header>

      {/* Progress */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors",
                  index <= currentStepIndex
                    ? "bg-accent-500 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                )}
              >
                {index < currentStepIndex ? (
                  <Check className="w-5 h-5" />
                ) : (
                  index + 1
                )}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "w-12 h-1 mx-1",
                    index < currentStepIndex
                      ? "bg-accent-500"
                      : "bg-gray-200 dark:bg-gray-700"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="p-6 max-w-lg mx-auto">
        {currentStep === "basics" && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Band Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., The Wavelengths"
                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location *
              </label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., San Francisco, CA"
                  className="w-full pl-12 pr-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === "genre" && (
          <div className="space-y-6 animate-fade-in">
            <p className="text-gray-600 dark:text-gray-400">
              Select your primary genre
            </p>
            <div className="grid grid-cols-2 gap-3">
              {GENRES.map((genre) => (
                <button
                  key={genre}
                  onClick={() => setFormData({ ...formData, genre })}
                  className={cn(
                    "p-4 rounded-xl border-2 text-left transition-all",
                    formData.genre === genre
                      ? "border-accent-500 bg-accent-50 dark:bg-accent-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  )}
                >
                  <span className="font-medium text-gray-900 dark:text-white">
                    {genre.charAt(0).toUpperCase() + genre.slice(1)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {currentStep === "details" && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bio (optional)
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell fans about your band..."
                rows={4}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Number of Members
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setFormData({ ...formData, memberCount: Math.max(1, formData.memberCount - 1) })}
                  className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xl font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  -
                </button>
                <span className="text-2xl font-bold text-gray-900 dark:text-white min-w-[3rem] text-center">
                  {formData.memberCount}
                </span>
                <button
                  onClick={() => setFormData({ ...formData, memberCount: formData.memberCount + 1 })}
                  className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xl font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}

        {currentStep === "social" && (
          <div className="space-y-4 animate-fade-in">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Add your social media links (optional)
            </p>

            {[
              { key: "spotify", label: "Spotify" },
              { key: "appleMusic", label: "Apple Music" },
              { key: "instagram", label: "Instagram" },
              { key: "youtube", label: "YouTube" },
              { key: "tiktok", label: "TikTok" },
              { key: "website", label: "Website" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {label}
                </label>
                <input
                  type="url"
                  value={formData.socialLinks[key as keyof typeof formData.socialLinks] || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      socialLinks: {
                        ...formData.socialLinks,
                        [key]: e.target.value || undefined,
                      },
                    })
                  }
                  placeholder={`https://${key === "website" ? "yourband.com" : `${key.toLowerCase()}.com/yourband`}`}
                  className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-red-500 text-sm text-center mt-4">{error}</p>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {currentStepIndex > 0 && (
            <button
              onClick={handleBack}
              className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Back
            </button>
          )}
          
          {currentStepIndex < STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className={cn(
                "flex-1 py-3 px-4 font-medium rounded-xl transition-colors flex items-center justify-center gap-2",
                canProceed()
                  ? "bg-accent-500 text-white hover:bg-accent-600"
                  : "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
              )}
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={cn(
                "flex-1 py-3 px-4 bg-accent-500 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2",
                isSubmitting
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-accent-600"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Create Band
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
