"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Camera, Check, User, Music, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { fadeFast, panelFade, presenceSyncNoInitial } from "@/lib/motion/presets";
import { GENRES, GENRE_COLORS } from "@ear-plug/shared/constants";
import type { Genre } from "@ear-plug/shared/types";
import Image from "next/image";
import { CityAutocomplete } from "@/components/ui/CityAutocomplete";

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
  topGenres?: Genre[];
  avatarFile?: File;
  removeAvatar?: boolean;
}

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

export function EditProfileModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: EditProfileModalProps) {
  const latestInitialDataRef = useRef(initialData);
  const wasOpenRef = useRef(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    name: initialData.name,
    location: initialData.location,
    topGenres: initialData.topGenres,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(
    initialData.avatar ?? undefined,
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    latestInitialDataRef.current = initialData;
  }, [initialData]);

  // Initialize once per open cycle to avoid live-query re-render resets.
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      const currentInitialData = latestInitialDataRef.current;
      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current);
        avatarObjectUrlRef.current = null;
      }
      setFormData({
        name: currentInitialData.name,
        location: currentInitialData.location,
        topGenres: currentInitialData.topGenres,
      });
      setError(null);
      setAvatarError(null);
      setAvatarPreview(currentInitialData.avatar ?? undefined);
      setAvatarFile(null);
      setRemoveAvatar(false);
      setTouched({});
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current);
      }
    };
  }, []);

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
      await onSave({
        ...formData,
        avatarFile: avatarFile ?? undefined,
        removeAvatar: avatarFile ? false : removeAvatar,
      });
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

  const handleAvatarSelect = (file: File) => {
    if (!IMAGE_MIME_TYPES.has(file.type)) {
      setAvatarError("Image format must be JPEG, PNG, or WEBP.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setAvatarError("Image size must be 10 MB or less.");
      return;
    }

    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = null;
    }

    const nextObjectUrl = URL.createObjectURL(file);
    avatarObjectUrlRef.current = nextObjectUrl;
    setAvatarPreview(nextObjectUrl);
    setAvatarFile(file);
    setRemoveAvatar(false);
    setAvatarError(null);
  };

  const handleRemoveAvatar = () => {
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = null;
    }
    setAvatarPreview(undefined);
    setAvatarFile(null);
    setRemoveAvatar(Boolean(initialData.avatar));
    setAvatarError(null);
  };

  const selectedGenresCount = formData.topGenres?.length || 0;
  const canSelectMoreGenres = selectedGenresCount < 5;

  return (
    <AnimatePresence {...presenceSyncNoInitial}>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fadeFast}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            variants={panelFade}
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
              <button

                onClick={onClose}
                className="p-2.5 hover:bg-muted border border-border hover:border-fan/30 rounded-xl transition-colors touch-target"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="p-5 space-y-6 overflow-y-auto max-h-[calc(90vh-80px)]"
            >
              {/* Avatar Section */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="w-28 h-28 bg-gradient-to-br from-fan/20 to-fan/5 border-2 border-fan/20 rounded-2xl overflow-hidden flex items-center justify-center shadow-inner">
                    {avatarPreview ? (
                      <Image
                        src={avatarPreview}
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
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}

                    className="absolute -bottom-1 -right-1 w-10 h-10 bg-fan text-white rounded-xl shadow-lg shadow-fan/30 hover:bg-fan/90 transition-colors flex items-center justify-center"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      handleAvatarSelect(file);
                    }
                    event.target.value = "";
                  }}
                />
                <div className="mt-3 flex items-center gap-2">
                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="text-xs text-red-500 hover:text-red-400 transition-colors"
                    >
                      Remove photo
                    </button>
                  )}
                  {!avatarPreview && (
                    <p className="text-xs text-muted-foreground text-center">
                      JPEG/PNG/WEBP up to 10MB
                    </p>
                  )}
                </div>
                {avatarError && (
                  <p className="text-xs text-red-500 mt-2 text-center">{avatarError}</p>
                )}
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
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
                        "w-full px-4 py-3.5 bg-muted/50 border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors transition-shadow",
                        touched.name && !formData.name.trim()
                          ? "border-red-500/50 focus:border-red-500"
                          : "border-border focus:border-fan/50 focus:bg-fan/[0.02] focus:ring-2 focus:ring-fan/10"
                      )}
                    />
                    {touched.name && !formData.name.trim() && (
                      <p className="text-xs text-red-500 mt-1.5 ml-1">
                        Name is required
                      </p>
                    )}
                  </div>
                </div>

                {/* Location Field - Using CityAutocomplete */}
                <div>
                  <CityAutocomplete
                    value={formData.location || ""}
                    onChange={(city) => handleFieldChange("location", city as string)}
                    placeholder="e.g., San Francisco, CA"
                    label="Location"
                  />
                </div>
              </div>

              {/* Top Genres Section */}
              <div>
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
                  {GENRES.map((genre) => {
                    const isSelected = formData.topGenres?.includes(genre.value);
                    const isDisabled = !isSelected && !canSelectMoreGenres;
                    
                    return (
                      <button
                        key={genre.value}
                        type="button"
                        onClick={() => !isDisabled && toggleGenre(genre.value)}
                        disabled={isDisabled}
                        className={cn(
                          "px-3 py-2 text-xs font-medium rounded-xl transition-colors transition-shadow duration-200 flex items-center gap-1.5",
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
                          <span>
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                        {genre.label}
                      </button>
                    );
                  })}
                </div>
                
                {selectedGenresCount >= 5 && (
                  <p className="text-xs text-fan mt-2">
                    Maximum 5 genres selected. Deselect one to choose another.
                  </p>
                )}
              </div>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    variants={panelFade}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl"
                  >
                    <p className="text-sm text-red-500 text-center">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}

                  className="flex-1 py-3.5 px-4 bg-muted border border-border text-muted-foreground font-medium rounded-xl hover:bg-muted/80 transition-colors touch-target"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className={cn(
                    "flex-1 py-3.5 px-4 bg-fan text-white font-medium rounded-xl transition-colors transition-shadow touch-target flex items-center justify-center gap-2",
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
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
