"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Camera, Check, User, Music, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { panelFade } from "@/lib/motion/presets";
import {
  GENRES,
  GENRE_COLORS,
  IMAGE_FILE_INPUT_ACCEPT,
  IMAGE_UPLOAD_MIME_TYPES,
  MAX_IMAGE_UPLOAD_BYTES,
} from "@ear-plug/shared/constants";
import {
  composePersonalName,
  getProfileLocationValidationError,
  getPersonalNameValidationError,
  hasRequiredProfileLocation,
  normalizeProfileLocation,
} from "@ear-plug/shared/utils";
import type { Genre } from "@ear-plug/shared/types";
import Image from "next/image";
import { CityAutocomplete } from "@/components/ui/CityAutocomplete";
import { ResponsiveSheetModal } from "@/components/ui/ResponsiveSheetModal";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProfileFormData) => Promise<void>;
  initialData: {
    firstName: string;
    lastName: string;
    location?: string;
    avatar?: string;
    topGenres?: Genre[];
  };
}

interface ProfileFormData {
  firstName: string;
  lastName: string;
  location?: string;
  topGenres?: Genre[];
  avatarFile?: File;
  removeAvatar?: boolean;
}

const IMAGE_MIME_TYPES = new Set<string>(IMAGE_UPLOAD_MIME_TYPES);

export function EditProfileModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: EditProfileModalProps) {
  const latestInitialDataRef = useRef(initialData);
  const wasOpenRef = useRef(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: initialData.firstName,
    lastName: initialData.lastName,
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
        firstName: currentInitialData.firstName,
        lastName: currentInitialData.lastName,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = getPersonalNameValidationError(
      formData.firstName,
      formData.lastName,
    );
    setTouched((prev) => ({
      ...prev,
      firstName: true,
      lastName: true,
      location: true,
    }));
    if (validationError) {
      setError(validationError);
      return;
    }

    const locationValidationError = getProfileLocationValidationError(
      formData.location,
    );
    if (locationValidationError) {
      setError(locationValidationError);
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        ...formData,
        location: normalizeProfileLocation(formData.location),
        avatarFile: avatarFile ?? undefined,
        removeAvatar: avatarFile ? false : removeAvatar,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save profile. Please try again.",
      );
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
    if (error) {
      setError(null);
    }
  };

  const handleAvatarSelect = (file: File) => {
    if (!IMAGE_MIME_TYPES.has(file.type)) {
      setAvatarError("Image format must be JPEG, PNG, or WEBP.");
      return;
    }

    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
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
  const locationError =
    touched.location && !hasRequiredProfileLocation(formData.location)
      ? "Location is required."
      : undefined;

  return (
    <ResponsiveSheetModal
      isOpen={isOpen}
      onClose={onClose}
      closeDisabled={isSaving}
      labelledBy="edit-profile-modal-title"
    >
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-border bg-card/95 px-4 py-4 backdrop-blur-xl sm:px-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-fan/20 bg-fan/10">
                <Sparkles className="w-5 h-5 text-fan" />
              </div>
              <div className="min-w-0">
                <h2
                  id="edit-profile-modal-title"
                  className="text-base font-bold text-foreground sm:text-lg"
                >
                  Edit Profile
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Update your personal information
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="touch-target shrink-0 rounded-xl border border-border bg-muted p-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-24 pt-4 sm:px-5 sm:pb-8">
          <div className="space-y-6">
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
                        {composePersonalName(
                          formData.firstName,
                          formData.lastName,
                        )
                          .charAt(0)
                          .toUpperCase() || "?"}
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
                  accept={IMAGE_FILE_INPUT_ACCEPT}
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
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    Name
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) =>
                          handleFieldChange("firstName", e.target.value)
                        }
                        placeholder="First name"
                        autoComplete="given-name"
                        className={cn(
                          "w-full px-4 py-3.5 bg-muted/50 border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors transition-shadow",
                          touched.firstName && !formData.firstName.trim()
                            ? "border-red-500/50 focus:border-red-500"
                            : "border-border focus:border-fan/50 focus:bg-fan/[0.02] focus:ring-2 focus:ring-fan/10"
                        )}
                      />
                      {touched.firstName && !formData.firstName.trim() && (
                        <p className="text-xs text-red-500 mt-1.5 ml-1">
                          First name is required
                        </p>
                      )}
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) =>
                          handleFieldChange("lastName", e.target.value)
                        }
                        placeholder="Last name"
                        autoComplete="family-name"
                        className={cn(
                          "w-full px-4 py-3.5 bg-muted/50 border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors transition-shadow",
                          touched.lastName && !formData.lastName.trim()
                            ? "border-red-500/50 focus:border-red-500"
                            : "border-border focus:border-fan/50 focus:bg-fan/[0.02] focus:ring-2 focus:ring-fan/10"
                        )}
                      />
                      {touched.lastName && !formData.lastName.trim() && (
                        <p className="text-xs text-red-500 mt-1.5 ml-1">
                          Last name is required
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Location Field - Using CityAutocomplete */}
                <div>
                  <CityAutocomplete
                    value={formData.location || ""}
                    onChange={(city) => handleFieldChange("location", city as string)}
                    placeholder="e.g., San Francisco, CA"
                    label="Location"
                    required
                    error={locationError}
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
            </div>
          </div>

        <div className="safe-area-inset-bottom border-t border-border bg-card/95 px-4 pb-4 pt-3 backdrop-blur-xl sm:px-5">
          <AnimatePresence>
            {error ? (
              <motion.div
                variants={panelFade}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="mb-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4"
              >
                <p className="text-center text-sm text-red-500">{error}</p>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="touch-target w-full rounded-xl border border-border bg-muted px-4 py-3.5 font-medium text-muted-foreground transition-colors hover:bg-muted/80"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={cn(
                "touch-target flex w-full items-center justify-center gap-2 rounded-xl bg-fan px-4 py-3.5 font-medium text-white transition-colors transition-shadow",
                isSaving
                  ? "cursor-not-allowed opacity-70"
                  : "shadow-lg shadow-fan/25 hover:bg-fan/90"
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
        </div>
      </form>
    </ResponsiveSheetModal>
  );
}
