"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Check,
  Minus,
  Plus,
  Music,
  MapPin,
  FileText,
  Users,
  Link as LinkIcon,
  Loader2,
  Sparkles,
  Globe,
  ImageIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { CityAutocomplete } from "@/components/ui/CityAutocomplete";
import { cn } from "@/lib/utils";
import { GENRES, GENRE_COLORS } from "@ear-plug/shared/constants";
import type { Genre } from "@ear-plug/shared/types";
import type { Id } from "../../../../../convex/_generated/dataModel";

interface EditBandProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  band: {
    _id: Id<"bands">;
    name: string;
    genres: Genre[];
    location: string;
    bio?: string;
    memberCount?: number;
    image?: string;
    socialLinks?: {
      spotify?: string;
      appleMusic?: string;
      instagram?: string;
      tiktok?: string;
      youtube?: string;
      website?: string;
    };
  };
}

type TabType = "info" | "social";

const SOCIAL_LINKS = [
  { key: "spotify", label: "Spotify", icon: Music, placeholder: "https://open.spotify.com/artist/..." },
  { key: "appleMusic", label: "Apple Music", icon: Music, placeholder: "https://music.apple.com/artist/..." },
  { key: "instagram", label: "Instagram", icon: Users, placeholder: "https://instagram.com/yourband" },
  { key: "youtube", label: "YouTube", icon: Globe, placeholder: "https://youtube.com/@yourband" },
  { key: "tiktok", label: "TikTok", icon: Music, placeholder: "https://tiktok.com/@yourband" },
  { key: "website", label: "Website", icon: LinkIcon, placeholder: "https://yourband.com" },
] as const;

// Animation variants
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants = {
  hidden: { opacity: 0, y: 100, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    y: 100,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
};

const contentVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
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
    x: direction > 0 ? 20 : -20,
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
    x: direction < 0 ? 20 : -20,
    opacity: 0,
    transition: { duration: 0.15 },
  }),
};

export function EditBandProfileModal({
  isOpen,
  onClose,
  band,
}: EditBandProfileModalProps) {
  const updateBand = useMutation(api.bands.update);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("info");
  const [tabDirection, setTabDirection] = useState(0);

  const [formData, setFormData] = useState({
    name: band.name,
    genres: band.genres,
    location: band.location,
    bio: band.bio || "",
    memberCount: band.memberCount || 1,
    socialLinks: {
      spotify: band.socialLinks?.spotify || "",
      appleMusic: band.socialLinks?.appleMusic || "",
      instagram: band.socialLinks?.instagram || "",
      tiktok: band.socialLinks?.tiktok || "",
      youtube: band.socialLinks?.youtube || "",
      website: band.socialLinks?.website || "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: band.name,
        genres: band.genres,
        location: band.location,
        bio: band.bio || "",
        memberCount: band.memberCount || 1,
        socialLinks: {
          spotify: band.socialLinks?.spotify || "",
          appleMusic: band.socialLinks?.appleMusic || "",
          instagram: band.socialLinks?.instagram || "",
          tiktok: band.socialLinks?.tiktok || "",
          youtube: band.socialLinks?.youtube || "",
          website: band.socialLinks?.website || "",
        },
      });
      setError(null);
      setActiveTab("info");
    }
  }, [isOpen, band]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleTabChange = (tab: TabType) => {
    setTabDirection(tab === "social" ? 1 : -1);
    setActiveTab(tab);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Band name is required");
      return;
    }

    if (formData.genres.length === 0) {
      setError("Please select at least one genre");
      return;
    }

    setIsSaving(true);
    try {
      // Clean up social links (remove empty strings)
      const cleanedSocialLinks: Partial<typeof formData.socialLinks> = {};
      Object.entries(formData.socialLinks).forEach(([key, value]) => {
        if (value.trim()) {
          cleanedSocialLinks[key as keyof typeof formData.socialLinks] = value.trim();
        }
      });

      await updateBand({
        bandId: band._id,
        name: formData.name.trim(),
        genres: formData.genres,
        location: formData.location.trim(),
        bio: formData.bio.trim() || undefined,
        memberCount: formData.memberCount || undefined,
        socialLinks:
          Object.keys(cleanedSocialLinks).length > 0 ? cleanedSocialLinks : undefined,
      });

      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update band profile");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleGenre = useCallback((genre: Genre) => {
    const isSelected = formData.genres.includes(genre);
    if (isSelected) {
      setFormData((prev) => ({
        ...prev,
        genres: prev.genres.filter((g) => g !== genre),
      }));
    } else if (formData.genres.length < 5) {
      setFormData((prev) => ({
        ...prev,
        genres: [...prev.genres, genre],
      }));
    }
  }, [formData.genres]);

  const selectedGenresCount = formData.genres.length;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-lg mx-4 bg-card border border-border rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-xl border-b border-border px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-band/10 border border-band/20 rounded-xl flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-band" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Edit Band Profile</h2>
                  <p className="text-xs text-muted-foreground">Update your band information</p>
                </div>
              </div>
              <motion.button

                onClick={onClose}
                className="p-2.5 hover:bg-muted border border-border hover:border-band/30 rounded-xl transition-colors touch-target"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </motion.button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border px-4">
              {[
                { id: "info" as const, label: "Basic Info", icon: Sparkles },
                { id: "social" as const, label: "Social Links", icon: LinkIcon },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
                    activeTab === tab.id
                      ? "text-band"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="editBandTabIndicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-band rounded-full"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait" custom={tabDirection}>
                <motion.div
                  key={activeTab}
                  custom={tabDirection}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="p-5"
                >
                  {activeTab === "info" ? (
                    <motion.div
                      variants={contentVariants}
                      initial="hidden"
                      animate="visible"
                      className="space-y-5"
                    >
                      {/* Band Name */}
                      <motion.div variants={itemVariants}>
                        <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                          <Music className="w-4 h-4 text-muted-foreground" />
                          Band Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Your band name"
                          className="w-full px-4 py-3.5 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-band/50 focus:ring-2 focus:ring-band/10 transition-all"
                        />
                      </motion.div>

                      {/* Genres */}
                      <motion.div variants={itemVariants}>
                        <div className="flex items-center justify-between mb-3">
                          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Sparkles className="w-4 h-4 text-muted-foreground" />
                            Genres
                          </label>
                          <span
                            className={cn(
                              "text-xs font-medium px-2 py-1 rounded-full transition-colors",
                              selectedGenresCount >= 5
                                ? "bg-band/10 text-band"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {selectedGenresCount}/5
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {GENRES.map((genre, index) => {
                            const isSelected = formData.genres.includes(genre.value);
                            const isDisabled = !isSelected && selectedGenresCount >= 5;

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
                                  "relative px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-1.5",
                                  isSelected
                                    ? "text-white shadow-sm"
                                    : isDisabled
                                    ? "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
                                    : "bg-muted border border-border text-muted-foreground hover:border-band/30 hover:text-foreground"
                                )}
                                style={
                                  isSelected
                                    ? { backgroundColor: GENRE_COLORS[genre.value] }
                                    : undefined
                                }
                              >
                                {isSelected && (
                                  <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                  >
                                    <Check className="w-3 h-3" />
                                  </motion.span>
                                )}
                                {genre.label}
                              </motion.button>
                            );
                          })}
                        </div>
                        {selectedGenresCount >= 5 && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="text-xs text-band mt-2"
                          >
                            Maximum 5 genres selected.
                          </motion.p>
                        )}
                      </motion.div>

                      {/* Location - Using CityAutocomplete */}
                      <motion.div variants={itemVariants}>
                        <CityAutocomplete
                          value={formData.location}
                          onChange={(city) => setFormData({ ...formData, location: city as string })}
                          placeholder="e.g., San Francisco, CA"
                          label="Location"
                          required
                        />
                      </motion.div>

                      {/* Bio */}
                      <motion.div variants={itemVariants}>
                        <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          Bio
                        </label>
                        <textarea
                          value={formData.bio}
                          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                          placeholder="Tell fans about your band, your story, and what makes your music unique..."
                          rows={4}
                          className="w-full px-4 py-3.5 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-band/50 focus:ring-2 focus:ring-band/10 transition-all resize-none"
                        />
                        <p className="text-xs text-muted-foreground mt-1.5 text-right">
                          {formData.bio.length}/500 characters
                        </p>
                      </motion.div>

                      {/* Number of Members */}
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
                  ) : (
                    <motion.div
                      variants={contentVariants}
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
                        const value = formData.socialLinks[social.key];

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
                                      [social.key]: e.target.value,
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
                    exit={{ opacity: 0 }}
                    className="mx-5 mb-4 p-4 bg-red-500/5 border border-red-500/20 rounded-xl"
                  >
                    <p className="text-sm text-red-500 text-center">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>

            {/* Actions */}
            <div className="p-5 border-t border-border flex gap-3">
              <motion.button
                type="button"
                onClick={onClose}

                className="flex-1 py-3.5 px-4 bg-muted border border-border text-muted-foreground font-medium rounded-xl hover:bg-muted/80 transition-colors touch-target"
              >
                Cancel
              </motion.button>
              <motion.button
                type="button"
                onClick={handleSubmit}
                disabled={isSaving}
                whileTap={!isSaving ? { scale: 0.98 } : {}}
                className={cn(
                  "flex-1 py-3.5 px-4 font-medium rounded-xl transition-all flex items-center justify-center gap-2 touch-target",
                  isSaving
                    ? "bg-muted border border-border text-muted-foreground cursor-not-allowed"
                    : "bg-band text-white hover:bg-band/90 shadow-lg shadow-band/25"
                )}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
