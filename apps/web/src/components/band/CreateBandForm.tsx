"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import {
  ArrowLeft,
  ArrowRight,
  Music,
  Users,
  Link as LinkIcon,
  Check,
  Loader2,
  Mic2,
} from "lucide-react";
import { CityAutocomplete } from "@/components/ui/CityAutocomplete";
import { GENRES } from "@ear-plug/shared/constants";
import type { Genre } from "@ear-plug/shared/types";
import { cn } from "@/lib/utils";
import { useProfileContext } from "@/hooks/useProfileContext";

type Step = "basics" | "genre" | "details" | "social";

interface FormData {
  name: string;
  location: string;
  genres: Genre[];
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
  { id: "genre", title: "Genre", icon: <Mic2 className="w-4 h-4" /> },
  { id: "details", title: "Details", icon: <Users className="w-4 h-4" /> },
  { id: "social", title: "Links", icon: <LinkIcon className="w-4 h-4" /> },
];

export function CreateBandForm() {
  const router = useRouter();
  const createBand = useMutation(api.bands.create);
  const { setBandMode } = useProfileContext();

  const [currentStep, setCurrentStep] = useState<Step>("basics");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    location: "",
    genres: [],
    bio: "",
    memberCount: 1,
    socialLinks: {},
  });

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  const canProceed = () => {
    switch (currentStep) {
      case "basics":
        return (
          formData.name.trim().length > 0 && formData.location.trim().length > 0
        );
      case "genre":
        return formData.genres.length > 0;
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
    } else {
      router.back();
    }
  };

  const handleSubmit = async () => {
    if (formData.genres.length === 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const bandId = await createBand({
        name: formData.name.trim(),
        location: formData.location.trim(),
        genres: formData.genres,
        bio: formData.bio.trim() || undefined,
        memberCount: formData.memberCount || undefined,
        socialLinks:
          Object.keys(formData.socialLinks).length > 0
            ? formData.socialLinks
            : undefined,
      });

      setBandMode(bandId);
      router.push("/home");
    } catch (err: any) {
      setError(err.message || "Failed to create band. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Brutalist Style */}
      <header className="bg-card border-b-2 border-band/20 p-6">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-band mb-4 transition-colors text-sm  "
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <h1 className="text-2xl font-bold text-foreground">Create Your Band</h1>
        <p className="text-muted-foreground mt-1 text-sm  ">
          Set up your band profile to start booking gigs
        </p>
      </header>

      {/* Progress - Brutalist Steps */}
      <div className="p-4 border-b-2 border-border bg-card/50">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  "w-10 h-10 flex items-center justify-center font-bold transition-all border-2",
                  index <= currentStepIndex
                    ? "bg-band border-band text-foreground"
                    : "bg-muted border-border text-muted-foreground",
                )}
              >
                {index < currentStepIndex ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="text-sm">{index + 1}</span>
                )}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "w-12 h-0.5 mx-1",
                    index < currentStepIndex ? "bg-band" : "bg-muted",
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Labels */}
        <div className="flex items-center justify-between max-w-md mx-auto mt-2">
          {STEPS.map((step, index) => (
            <span
              key={step.id}
              className={cn(
                "text-[10px]   font-medium",
                index <= currentStepIndex
                  ? "text-band"
                  : "text-muted-foreground",
              )}
              style={{ width: "40px", textAlign: "center" }}
            >
              {step.title}
            </span>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="p-6 max-w-lg mx-auto">
        {currentStep === "basics" && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <label className="block text-xs font-bold   text-muted-foreground mb-3">
                Band Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., The Wavelengths"
                className="w-full px-4 py-3.5 bg-muted border-2 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-band transition-colors"
              />
            </div>

            <CityAutocomplete
              value={formData.location}
              onChange={(city) => setFormData({ ...formData, location: city })}
              placeholder="e.g., San Francisco, CA"
              required
            />
          </div>
        )}

        {currentStep === "genre" && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <p className="text-muted-foreground text-sm  ">
                Select your genres
              </p>
              <p className="text-xs text-band font-bold   mt-2">
                {formData.genres.length}/5 selected
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {GENRES.map((genre) => {
                const isSelected = formData.genres.includes(genre.value);
                const isDisabled = !isSelected && formData.genres.length >= 5;
                return (
                  <button
                    key={genre.value}
                    onClick={() => {
                      if (isSelected) {
                        setFormData({
                          ...formData,
                          genres: formData.genres.filter(
                            (g) => g !== genre.value,
                          ),
                        });
                      } else if (!isDisabled) {
                        setFormData({
                          ...formData,
                          genres: [...formData.genres, genre.value],
                        });
                      }
                    }}
                    disabled={isDisabled}
                    className={cn(
                      "p-4 border-2 text-left transition-all relative overflow-hidden",
                      isSelected
                        ? "border-band bg-band/10"
                        : isDisabled
                          ? "border-border opacity-50 cursor-not-allowed"
                          : "border-border hover:border-muted-foreground bg-muted",
                    )}
                  >
                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute top-0 right-0 w-0 h-0 border-t-[20px] border-t-fan border-l-[20px] border-l-transparent" />
                    )}
                    <span
                      className={cn(
                        "font-bold   text-sm",
                        isSelected ? "text-band" : "text-foreground",
                      )}
                    >
                      {genre.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {currentStep === "details" && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <label className="block text-xs font-bold   text-muted-foreground mb-3">
                Bio <span className="text-muted-foreground">(Optional)</span>
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
                placeholder="Tell fans about your band..."
                rows={4}
                className="w-full px-4 py-3.5 bg-muted border-2 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-band transition-colors resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold   text-muted-foreground mb-3">
                Number of Members
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() =>
                    setFormData({
                      ...formData,
                      memberCount: Math.max(1, formData.memberCount - 1),
                    })
                  }
                  className="w-14 h-14 bg-muted border-2 border-border flex items-center justify-center text-xl font-bold text-muted-foreground hover:border-band hover:text-band transition-all touch-target"
                >
                  -
                </button>
                <span className="text-3xl font-bold text-foreground min-w-[4rem] text-center">
                  {formData.memberCount}
                </span>
                <button
                  onClick={() =>
                    setFormData({
                      ...formData,
                      memberCount: formData.memberCount + 1,
                    })
                  }
                  className="w-14 h-14 bg-muted border-2 border-border flex items-center justify-center text-xl font-bold text-muted-foreground hover:border-band hover:text-band transition-all touch-target"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}

        {currentStep === "social" && (
          <div className="space-y-4 animate-fade-in">
            <p className="text-muted-foreground text-sm   mb-4">
              Add your social links{" "}
              <span className="text-muted-foreground">(Optional)</span>
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
                <label className="block text-xs font-bold   text-muted-foreground mb-2">
                  {label}
                </label>
                <input
                  type="url"
                  value={
                    formData.socialLinks[
                      key as keyof typeof formData.socialLinks
                    ] || ""
                  }
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
                  className="w-full px-4 py-3 bg-muted border-2 border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:border-band transition-colors"
                />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-6 p-4 border-2 border-red-500/30 bg-red-500/10">
            <p className="text-red-400 text-sm text-center   font-medium">
              {error}
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {currentStepIndex > 0 && (
            <button
              onClick={handleBack}
              className="flex-1 py-3.5 px-4 bg-muted border-2 border-border text-muted-foreground font-bold text-sm hover:border-muted-foreground hover:text-foreground transition-all touch-target"
            >
              Back
            </button>
          )}

          {currentStepIndex < STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className={cn(
                "flex-1 py-3.5 px-4 font-bold   text-sm transition-all flex items-center justify-center gap-2 border-2 touch-target",
                canProceed()
                  ? "bg-band border-band text-foreground hover:bg-transparent hover:text-band"
                  : "bg-muted border-border text-muted-foreground cursor-not-allowed",
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
                "flex-1 py-3.5 px-4 font-bold   text-sm transition-all flex items-center justify-center gap-2 border-2 touch-target",
                isSubmitting
                  ? "bg-muted border-border text-muted-foreground cursor-not-allowed"
                  : "bg-band border-band text-foreground hover:bg-transparent hover:text-band",
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
