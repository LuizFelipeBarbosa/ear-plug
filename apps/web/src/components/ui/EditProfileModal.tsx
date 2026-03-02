"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Camera, Check, MapPin, User, Music, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { GENRES, GENRE_COLORS } from "@ear-plug/shared/constants";
import type { Genre } from "@ear-plug/shared/types";
import Image from "next/image";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProfileFormData) => Promise<void>;
  initialData: {
    name: string;
    location?: string;
    avatar?: string;
    topGenres?: Genre[];
  };
}

interface ProfileFormData {
  name: string;
  location?: string;
  avatar?: string;
  topGenres?: Genre[];
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants = {
  hidden: { 
    opacity: 0, 
    y: 100,
    scale: 0.95,
  },
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
    transition: {
      duration: 0.2,
    },
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

export function EditProfileModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: EditProfileModalProps) {
  const [formData, setFormData] = useState<ProfileFormData>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(initialData);
      setError(null);
      setTouched({});
    }
  }, [isOpen, initialData]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Please enter your name");
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError("Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleGenre = useCallback((genre: Genre) => {
    const currentGenres = formData.topGenres || [];
    if (currentGenres.includes(genre)) {
      setFormData({
        ...formData,
        topGenres: currentGenres.filter((g) => g !== genre),
      });
    } else {
      // Limit to 5 genres
      if (currentGenres.length < 5) {
        setFormData({
          ...formData,
          topGenres: [...currentGenres, genre],
        });
      }
    }
  }, [formData]);

  const handleFieldChange = (field: keyof ProfileFormData, value: string) => {
    setFormData({ ...formData, [field]: value });
    setTouched({ ...touched, [field]: true });
  };

  const selectedGenresCount = formData.topGenres?.length || 0;
  const canSelectMoreGenres = selectedGenresCount < 5;

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
            className="relative w-full max-w-lg mx-4 bg-card border border-border rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-xl border-b border-border px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-fan/10 border border-fan/20 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-fan" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Edit Profile</h2>
                  <p className="text-xs text-muted-foreground">
                    Update your personal information
                  </p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2.5 hover:bg-muted border border-border hover:border-fan/30 rounded-xl transition-colors touch-target"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </motion.button>
            </div>

            {/* Form */}
            <motion.form
              variants={contentVariants}
              initial="hidden"
              animate="visible"
              onSubmit={handleSubmit}
              className="p-5 space-y-6 overflow-y-auto max-h-[calc(90vh-80px)]"
            >
              {/* Avatar Section */}
              <motion.div variants={itemVariants} className="flex flex-col items-center">
                <div className="relative">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="w-28 h-28 bg-gradient-to-br from-fan/20 to-fan/5 border-2 border-fan/20 rounded-2xl overflow-hidden flex items-center justify-center shadow-inner"
                  >
                    {formData.avatar ? (
                      <Image
                        src={formData.avatar}
                        alt="Avatar"
                        width={112}
                        height={112}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <span className="text-4xl font-bold text-fan">
                        {formData.name?.charAt(0).toUpperCase() || "?"}
                      </span>
                    )}
                  </motion.div>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="absolute -bottom-1 -right-1 w-10 h-10 bg-fan text-white rounded-xl shadow-lg shadow-fan/30 hover:bg-fan/90 transition-colors flex items-center justify-center"
                  >
                    <Camera className="w-4 h-4" />
                  </motion.button>
                </div>
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Avatar synced from your account
                </p>
              </motion.div>

              {/* Form Fields */}
              <motion.div variants={itemVariants} className="space-y-4">
                {/* Name Field */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    Display Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleFieldChange("name", e.target.value)}
                      placeholder="Your name"
                      className={cn(
                        "w-full px-4 py-3.5 bg-muted/50 border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none transition-all",
                        touched.name && !formData.name.trim()
                          ? "border-red-500/50 focus:border-red-500"
                          : "border-border focus:border-fan/50 focus:bg-fan/[0.02] focus:ring-2 focus:ring-fan/10"
                      )}
                    />
                    {touched.name && !formData.name.trim() && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-red-500 mt-1.5 ml-1"
                      >
                        Name is required
                      </motion.p>
                    )}
                  </div>
                </div>

                {/* Location Field */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    Location
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.location || ""}
                      onChange={(e) => handleFieldChange("location", e.target.value)}
                      placeholder="e.g., San Francisco, CA"
                      className="w-full px-4 py-3.5 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-fan/50 focus:bg-fan/[0.02] focus:ring-2 focus:ring-fan/10 transition-all"
                    />
                  </div>
                </div>
              </motion.div>

              {/* Top Genres Section */}
              <motion.div variants={itemVariants}>
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Music className="w-4 h-4 text-muted-foreground" />
                    Favorite Genres
                  </label>
                  <span className={cn(
                    "text-xs font-medium px-2 py-1 rounded-full transition-colors",
                    selectedGenresCount >= 5
                      ? "bg-fan/10 text-fan"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {selectedGenresCount}/5 selected
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {GENRES.map((genre, index) => {
                    const isSelected = formData.topGenres?.includes(genre.value);
                    const isDisabled = !isSelected && !canSelectMoreGenres;
                    
                    return (
                      <motion.button
                        key={genre.value}
                        type="button"
                        onClick={() => !isDisabled && toggleGenre(genre.value)}
                        disabled={isDisabled}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.03 }}
                        whileHover={!isDisabled ? { scale: 1.02 } : {}}
                        whileTap={!isDisabled ? { scale: 0.98 } : {}}
                        className={cn(
                          "px-3 py-2 text-xs font-medium rounded-xl transition-all duration-200 flex items-center gap-1.5",
                          isSelected
                            ? "text-white shadow-sm"
                            : isDisabled
                            ? "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
                            : "bg-muted border border-border text-muted-foreground hover:border-fan/30 hover:text-foreground"
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
                    className="text-xs text-fan mt-2"
                  >
                    Maximum 5 genres selected. Deselect one to choose another.
                  </motion.p>
                )}
              </motion.div>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl"
                  >
                    <p className="text-sm text-red-500 text-center">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions */}
              <motion.div variants={itemVariants} className="flex gap-3 pt-2">
                <motion.button
                  type="button"
                  onClick={onClose}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 py-3.5 px-4 bg-muted border border-border text-muted-foreground font-medium rounded-xl hover:bg-muted/80 transition-colors touch-target"
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  disabled={isSaving}
                  whileTap={!isSaving ? { scale: 0.98 } : {}}
                  className={cn(
                    "flex-1 py-3.5 px-4 bg-fan text-white font-medium rounded-xl transition-all touch-target flex items-center justify-center gap-2",
                    isSaving
                      ? "opacity-70 cursor-not-allowed"
                      : "hover:bg-fan/90 shadow-lg shadow-fan/25"
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
              </motion.div>
            </motion.form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
