"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import {
  ArrowLeft,
  ArrowRight,
  Music,
  Users,
  Link as LinkIcon,
  Check,
  Loader2,
  Mic2,
  MapPin,
  FileText,
  Minus,
  Plus,
  Globe,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../../../../convex/_generated/api";
import { CityAutocomplete } from "@/components/ui/CityAutocomplete";
import { GENRES, GENRE_COLORS } from "@ear-plug/shared/constants";
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

const STEPS: { id: Step; title: string; icon: React.ReactNode; description: string }[] = [
  { 
    id: "basics", 
    title: "Basics", 
    icon: <Music className="w-4 h-4" />,
    description: "Band name and location"
  },
  { 
    id: "genre", 
    title: "Genre", 
    icon: <Mic2 className="w-4 h-4" />,
    description: "Select your music style"
  },
  { 
    id: "details", 
    title: "Details", 
    icon: <Users className="w-4 h-4" />,
    description: "Bio and members"
  },
  { 
    id: "social", 
    title: "Links", 
    icon: <LinkIcon className="w-4 h-4" />,
    description: "Connect your socials"
  },
];

const SOCIAL_LINKS = [
  { key: "spotify", label: "Spotify", icon: Music, placeholder: "https://open.spotify.com/artist/..." },
  { key: "appleMusic", label: "Apple Music", icon: Music, placeholder: "https://music.apple.com/artist/..." },
  { key: "instagram", label: "Instagram", icon: Users, placeholder: "https://instagram.com/yourband" },
  { key: "youtube", label: "YouTube", icon: Globe, placeholder: "https://youtube.com/@yourband" },
  { key: "tiktok", label: "TikTok", icon: Music, placeholder: "https://tiktok.com/@yourband" },
  { key: "website", label: "Website", icon: Globe, placeholder: "https://yourband.com" },
] as const;

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 30,
    },
  },
};

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 30,
    },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 50 : -50,
    opacity: 0,
    transition: { duration: 0.15 },
  }),
};

export function CreateBandForm() {
  const router = useRouter();
  const createBand = useMutation(api.bands.create);
  const { setBandMode } = useProfileContext();

  const [currentStep, setCurrentStep] = useState<Step>("basics");
  const [direction, setDirection] = useState(0);
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

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case "basics":
        return formData.name.trim().length > 0 && formData.location.trim().length > 0;
      case "genre":
        return formData.genres.length > 0;
      case "details":
      case "social":
        return true;
      default:
        return false;
    }
  }, [currentStep, formData]);

  const handleNext = () => {
    const stepIndex = STEPS.findIndex((s) => s.id === currentStep);
    if (stepIndex < STEPS.length - 1) {
      setDirection(1);
      setCurrentStep(STEPS[stepIndex + 1].id);
    }
  };

  const handleBack = () => {
    const stepIndex = STEPS.findIndex((s) => s.id === currentStep);
    if (stepIndex > 0) {
      setDirection(-1);
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

  const toggleGenre = (genre: Genre) => {
    setFormData((prev) => {
      const isSelected = prev.genres.includes(genre);
      if (isSelected) {
        return { ...prev, genres: prev.genres.filter((g) => g !== genre) };
      } else if (prev.genres.length < 5) {
        return { ...prev, genres: [...prev.genres, genre] };
      }
      return prev;
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24 overflow-x-hidden">
      {/* Header Background */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-band/10 via-band/5 to-transparent h-48" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-band/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
      </div>

      {/* Header */}
      <header className="relative px-4 pt-4 pb-4">
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}

          onClick={handleBack}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-band transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-band/10 border border-band/20 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-band" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Create Your Band</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Set up your band profile to start booking gigs and connecting with venues
          </p>
        </motion.div>
      </header>

      {/* Progress Steps */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-4 py-4 border-y border-border bg-card/30 backdrop-blur-sm"
      >
        <div className="max-w-lg mx-auto">
          <div className="flex items-start justify-between">
            {STEPS.map((step, index) => {
              const isActive = index === currentStepIndex;
              const isCompleted = index < currentStepIndex;
              const isUpcoming = index > currentStepIndex;

              return (
                <div key={step.id} className="flex items-start flex-1 last:flex-0">
                  <div className="flex flex-col items-center">
                    <motion.div
                      className={cn(
                        "w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 border",
                        isCompleted
                          ? "bg-band border-band text-white"
                          : isActive
                          ? "bg-band/10 border-band text-band"
                          : "bg-muted/50 border-border text-muted-foreground"
                      )}
                      animate={{
                        scale: isActive ? 1.05 : 1,
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    >
                      {isCompleted ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        step.icon
                      )}
                    </motion.div>
                    <span
                      className={cn(
                        "text-[10px] font-medium mt-1.5 transition-colors",
                        isActive || isCompleted ? "text-band" : "text-muted-foreground"
                      )}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className="flex-1 h-0.5 mx-2 mt-5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-band"
                        initial={{ width: "0%" }}
                        animate={{ width: isCompleted ? "100%" : "0%" }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Form Content */}
      <main className="px-4 pt-6 max-w-lg mx-auto">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            {currentStep === "basics" && (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-6"
              >
                <motion.div variants={itemVariants}>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <Music className="w-4 h-4 text-muted-foreground" />
                    Band Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., The Wavelengths"
                    className="w-full px-4 py-3.5 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-band/50 focus:bg-band/[0.02] focus:ring-2 focus:ring-band/10 transition-all"
                  />
                </motion.div>

                <motion.div variants={itemVariants}>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    Location <span className="text-red-500">*</span>
                  </label>
                  <CityAutocomplete
                    value={formData.location}
                    onChange={(city) => setFormData({ ...formData, location: city as string })}
                    placeholder="e.g., San Francisco, CA"
                    label=""
                    required
                  />
                </motion.div>

                <motion.div variants={itemVariants} className="pt-2">
                  <div className="p-4 bg-band/5 border border-band/20 rounded-xl">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Tip:</span> Choose a memorable name that reflects your music style. Your location helps venues and fans find you.
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {currentStep === "genre" && (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                <motion.div variants={itemVariants} className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Mic2 className="w-4 h-4 text-muted-foreground" />
                    Select Genres
                  </label>
                  <span
                    className={cn(
                      "text-xs font-medium px-2.5 py-1 rounded-full transition-colors",
                      formData.genres.length >= 5
                        ? "bg-band/10 text-band"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {formData.genres.length}/5 selected
                  </span>
                </motion.div>

                <motion.div variants={itemVariants} className="grid grid-cols-2 gap-2">
                  {GENRES.map((genre, index) => {
                    const isSelected = formData.genres.includes(genre.value);
                    const isDisabled = !isSelected && formData.genres.length >= 5;

                    return (
                      <motion.button
                        key={genre.value}
                        type="button"
                        onClick={() => !isDisabled && toggleGenre(genre.value)}
                        disabled={isDisabled}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.02 }}
                        whileHover={!isDisabled ? { scale: 1.02 } : {}}
                        whileTap={!isDisabled ? { scale: 0.98 } : {}}
                        className={cn(
                          "relative p-4 rounded-xl text-left transition-all duration-200 flex items-center gap-3",
                          isSelected
                            ? "text-white shadow-sm"
                            : isDisabled
                            ? "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
                            : "bg-card border border-border hover:border-band/30"
                        )}
                        style={
                          isSelected
                            ? {
                                backgroundColor: GENRE_COLORS[genre.value],
                              }
                            : undefined
                        }
                      >
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-2 right-2"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </motion.div>
                        )}
                        <span
                          className={cn(
                            "font-medium text-sm",
                            isSelected ? "text-white" : "text-foreground"
                          )}
                        >
                          {genre.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </motion.div>

                {formData.genres.length >= 5 && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="text-xs text-band"
                  >
                    Maximum 5 genres selected. Deselect one to choose another.
                  </motion.p>
                )}
              </motion.div>
            )}

            {currentStep === "details" && (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-6"
              >
                <motion.div variants={itemVariants}>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    Bio <span className="text-muted-foreground font-normal">(Optional)</span>
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Tell fans about your band, your story, and what makes your music unique..."
                    rows={4}
                    className="w-full px-4 py-3.5 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-band/50 focus:bg-band/[0.02] focus:ring-2 focus:ring-band/10 transition-all resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5 text-right">
                    {formData.bio.length}/500 characters
                  </p>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-4">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    Number of Members
                  </label>
                  <div className="flex items-center justify-center gap-6">
                    <motion.button
                      type="button"

                      onClick={() =>
                        setFormData({
                          ...formData,
                          memberCount: Math.max(1, formData.memberCount - 1),
                        })
                      }
                      className="w-14 h-14 bg-muted/50 border border-border rounded-xl flex items-center justify-center text-foreground hover:border-band/30 hover:bg-band/5 transition-all"
                    >
                      <Minus className="w-5 h-5" />
                    </motion.button>
                    <motion.span
                      key={formData.memberCount}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-4xl font-bold text-foreground w-16 text-center"
                    >
                      {formData.memberCount}
                    </motion.span>
                    <motion.button
                      type="button"

                      onClick={() =>
                        setFormData({
                          ...formData,
                          memberCount: formData.memberCount + 1,
                        })
                      }
                      className="w-14 h-14 bg-muted/50 border border-border rounded-xl flex items-center justify-center text-foreground hover:border-band/30 hover:bg-band/5 transition-all"
                    >
                      <Plus className="w-5 h-5" />
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {currentStep === "social" && (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                <motion.p variants={itemVariants} className="text-sm text-muted-foreground">
                  Add your social links to help fans find you online{" "}
                  <span className="text-muted-foreground">(Optional)</span>
                </motion.p>

                {SOCIAL_LINKS.map((social, index) => {
                  const Icon = social.icon;
                  const value = formData.socialLinks[social.key as keyof typeof formData.socialLinks] || "";

                  return (
                    <motion.div key={social.key} variants={itemVariants}>
                      <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        {social.label}
                      </label>
                      <div className="relative">
                        <input
                          type="url"
                          value={value}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              socialLinks: {
                                ...formData.socialLinks,
                                [social.key]: e.target.value || undefined,
                              },
                            })
                          }
                          placeholder={social.placeholder}
                          className={cn(
                            "w-full px-4 py-3 bg-muted/50 border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-band/10 transition-all text-sm",
                            value
                              ? "border-band/30 bg-band/[0.02]"
                              : "border-border focus:border-band/50"
                          )}
                        />
                        {value && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                          >
                            <div className="w-5 h-5 bg-band/10 rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-band" />
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-6 p-4 bg-red-500/5 border border-red-500/20 rounded-xl"
            >
              <p className="text-sm text-red-500 text-center">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-3 mt-8"
        >
          {currentStepIndex > 0 && (
            <motion.button
              type="button"
              onClick={handleBack}

              className="flex-1 py-3.5 px-4 bg-muted border border-border text-muted-foreground font-medium rounded-xl hover:bg-muted/80 transition-colors touch-target"
            >
              Back
            </motion.button>
          )}

          {currentStepIndex < STEPS.length - 1 ? (
            <motion.button
              type="button"
              onClick={handleNext}
              disabled={!canProceed()}
              whileTap={canProceed() ? { scale: 0.98 } : {}}
              className={cn(
                "flex-1 py-3.5 px-4 font-medium rounded-xl transition-all flex items-center justify-center gap-2 touch-target",
                canProceed()
                  ? "bg-band text-white hover:bg-band/90 shadow-lg shadow-band/25"
                  : "bg-muted border border-border text-muted-foreground cursor-not-allowed"
              )}
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          ) : (
            <motion.button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              whileTap={!isSubmitting ? { scale: 0.98 } : {}}
              className={cn(
                "flex-1 py-3.5 px-4 font-medium rounded-xl transition-all flex items-center justify-center gap-2 touch-target",
                isSubmitting
                  ? "bg-muted border border-border text-muted-foreground cursor-not-allowed"
                  : "bg-band text-white hover:bg-band/90 shadow-lg shadow-band/25"
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
            </motion.button>
          )}
        </motion.div>

        {/* Step Description */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-xs text-muted-foreground mt-6"
        >
          Step {currentStepIndex + 1} of {STEPS.length}: {STEPS[currentStepIndex].description}
        </motion.p>
      </main>
    </div>
  );
}
