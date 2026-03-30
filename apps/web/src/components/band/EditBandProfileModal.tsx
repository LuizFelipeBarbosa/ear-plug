"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
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
  Camera,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { CityAutocomplete } from "@/components/ui/CityAutocomplete";
import { MobileTabRail } from "@/components/ui/MobileTabRail";
import { ResponsiveSheetModal } from "@/components/ui/ResponsiveSheetModal";
import { cn } from "@/lib/utils";
import { panelFade, presenceSyncNoInitial } from "@/lib/motion/presets";
import { GENRES, GENRE_COLORS } from "@ear-plug/shared/constants";
import type { Genre } from "@ear-plug/shared/types";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { uploadToConvexStorage } from "@/lib/convexUpload";

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

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

export function EditBandProfileModal({
  isOpen,
  onClose,
  band,
}: EditBandProfileModalProps) {
  const latestBandRef = useRef(band);
  const wasOpenRef = useRef(false);
  const updateBand = useMutation(api.bands.update);
  const generateImageUploadUrl = useMutation(api.bands.generateImageUploadUrl);
  const setImageFromStorage = useMutation(api.bands.setImageFromStorage);
  const clearImage = useMutation(api.bands.clearImage);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("info");
  const [imagePreview, setImagePreview] = useState<string | undefined>(
    band.image ?? undefined,
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageObjectUrlRef = useRef<string | null>(null);

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
    latestBandRef.current = band;
  }, [band]);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      const currentBand = latestBandRef.current;
      setFormData({
        name: currentBand.name,
        genres: currentBand.genres,
        location: currentBand.location,
        bio: currentBand.bio || "",
        memberCount: currentBand.memberCount || 1,
        socialLinks: {
          spotify: currentBand.socialLinks?.spotify || "",
          appleMusic: currentBand.socialLinks?.appleMusic || "",
          instagram: currentBand.socialLinks?.instagram || "",
          tiktok: currentBand.socialLinks?.tiktok || "",
          youtube: currentBand.socialLinks?.youtube || "",
          website: currentBand.socialLinks?.website || "",
        },
      });
      setError(null);
      setImageError(null);
      if (imageObjectUrlRef.current) {
        URL.revokeObjectURL(imageObjectUrlRef.current);
        imageObjectUrlRef.current = null;
      }
      setImagePreview(currentBand.image ?? undefined);
      setImageFile(null);
      setRemoveImage(false);
      setActiveTab("info");
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (imageObjectUrlRef.current) {
        URL.revokeObjectURL(imageObjectUrlRef.current);
      }
    };
  }, []);

  const handleTabChange = (tab: TabType) => {
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
      if (imageFile) {
        const { uploadUrl } = await generateImageUploadUrl({ bandId: band._id });
        const uploadData = await uploadToConvexStorage(uploadUrl, imageFile);
        await setImageFromStorage({
          bandId: band._id,
          storageId: uploadData.storageId as Id<"_storage">,
        });
      } else if (removeImage) {
        await clearImage({ bandId: band._id });
      }

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

  const handleImageSelect = (file: File) => {
    if (!IMAGE_MIME_TYPES.has(file.type)) {
      setImageError("Image format must be JPEG, PNG, or WEBP.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setImageError("Image size must be 10 MB or less.");
      return;
    }

    if (imageObjectUrlRef.current) {
      URL.revokeObjectURL(imageObjectUrlRef.current);
      imageObjectUrlRef.current = null;
    }

    const nextObjectUrl = URL.createObjectURL(file);
    imageObjectUrlRef.current = nextObjectUrl;
    setImagePreview(nextObjectUrl);
    setImageFile(file);
    setRemoveImage(false);
    setImageError(null);
  };

  const handleRemoveImage = () => {
    if (imageObjectUrlRef.current) {
      URL.revokeObjectURL(imageObjectUrlRef.current);
      imageObjectUrlRef.current = null;
    }
    setImagePreview(undefined);
    setImageFile(null);
    setRemoveImage(Boolean(band.image));
    setImageError(null);
  };

  const selectedGenresCount = formData.genres.length;
  const editTabs = [
    { id: "info", label: "Basic Info", icon: Sparkles },
    { id: "social", label: "Social Links", icon: LinkIcon },
  ];

  return (
    <ResponsiveSheetModal
      isOpen={isOpen}
      onClose={onClose}
      closeDisabled={isSaving}
      labelledBy="edit-band-profile-modal-title"
      panelClassName="sm:max-w-xl"
    >
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-border bg-card/95 px-4 pt-4 backdrop-blur-xl sm:px-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-band/20 bg-band/10">
                <ImageIcon className="w-5 h-5 text-band" />
              </div>
              <div className="min-w-0">
                <h2
                  id="edit-band-profile-modal-title"
                  className="text-base font-bold text-foreground sm:text-lg"
                >
                  Edit Band Profile
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Update your band information
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

          <MobileTabRail
            items={editTabs}
            activeTab={activeTab}
            onChange={(tabId) => handleTabChange(tabId as TabType)}
            layoutId="editBandTabIndicator"
            tone="band"
            className="-mx-4 mt-4 border-t border-border/60 sm:-mx-5"
            railClassName="px-4 sm:px-5"
          />
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-24 pt-4 sm:px-5 sm:pb-8">
          {activeTab === "info" ? (
            <div className="space-y-5">
              <div>
                <label className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  Band Photo
                </label>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-band/20 bg-gradient-to-br from-band/20 to-band/5">
                    {imagePreview ? (
                      <Image
                        src={imagePreview}
                        alt="Band photo preview"
                        width={96}
                        height={96}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-band">
                        {formData.name.trim().charAt(0).toUpperCase() || "?"}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-band/30 bg-band/10 px-3 py-2 text-xs font-medium text-band transition-colors hover:bg-band/15"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        {imagePreview ? "Change" : "Upload"}
                      </button>
                      {imagePreview ? (
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/15"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      JPEG, PNG, or WEBP up to 10MB.
                    </p>
                    {imageError ? (
                      <p className="text-xs text-red-500">{imageError}</p>
                    ) : null}
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      handleImageSelect(file);
                    }
                    event.target.value = "";
                  }}
                />
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Music className="w-4 h-4 text-muted-foreground" />
                  Band Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Your band name"
                  className="w-full rounded-xl border border-border bg-muted/50 px-4 py-3.5 text-foreground placeholder:text-muted-foreground transition-colors transition-shadow focus:border-band/50 focus:outline-none focus:ring-2 focus:ring-band/10"
                />
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Sparkles className="w-4 h-4 text-muted-foreground" />
                    Genres
                  </label>
                  <span
                    className={cn(
                      "rounded-full px-2 py-1 text-xs font-medium transition-colors",
                      selectedGenresCount >= 5
                        ? "bg-band/10 text-band"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {selectedGenresCount}/5
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map((genre) => {
                    const isSelected = formData.genres.includes(genre.value);
                    const isDisabled = !isSelected && selectedGenresCount >= 5;

                    return (
                      <button
                        key={genre.value}
                        type="button"
                        onClick={() => !isDisabled && toggleGenre(genre.value)}
                        disabled={isDisabled}
                        className={cn(
                          "relative flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors transition-shadow duration-200",
                          isSelected
                            ? "text-white shadow-sm"
                            : isDisabled
                              ? "cursor-not-allowed bg-muted/50 text-muted-foreground/50"
                              : "border border-border bg-muted text-muted-foreground hover:border-band/30 hover:text-foreground",
                        )}
                        style={
                          isSelected
                            ? { backgroundColor: GENRE_COLORS[genre.value] }
                            : undefined
                        }
                      >
                        {isSelected ? (
                          <span>
                            <Check className="w-3 h-3" />
                          </span>
                        ) : null}
                        {genre.label}
                      </button>
                    );
                  })}
                </div>
                {selectedGenresCount >= 5 ? (
                  <p className="mt-2 text-xs text-band">
                    Maximum 5 genres selected.
                  </p>
                ) : null}
              </div>

              <div>
                <CityAutocomplete
                  value={formData.location}
                  onChange={(city) =>
                    setFormData({ ...formData, location: city as string })
                  }
                  placeholder="e.g., San Francisco, CA"
                  label="Location"
                  required
                />
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  Bio
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell fans about your band, your story, and what makes your music unique..."
                  rows={4}
                  className="w-full resize-none rounded-xl border border-border bg-muted/50 px-4 py-3.5 text-foreground placeholder:text-muted-foreground transition-colors transition-shadow focus:border-band/50 focus:outline-none focus:ring-2 focus:ring-band/10"
                />
                <p className="mt-1.5 text-right text-xs text-muted-foreground">
                  {formData.bio.length}/500 characters
                </p>
              </div>

              <div>
                <label className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  Number of Members
                </label>
                <div className="flex items-center justify-center gap-4 sm:gap-6">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        memberCount: Math.max(1, formData.memberCount - 1),
                      })
                    }
                    className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted/50 text-foreground transition-colors hover:border-band/30 hover:bg-band/5 sm:h-14 sm:w-14"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="w-16 text-center text-3xl font-bold text-foreground sm:text-4xl">
                    {formData.memberCount}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        memberCount: formData.memberCount + 1,
                      })
                    }
                    className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted/50 text-foreground transition-colors hover:border-band/30 hover:bg-band/5 sm:h-14 sm:w-14"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Add your social links to help fans find you online{" "}
                <span className="text-muted-foreground">(Optional)</span>
              </p>

              {SOCIAL_LINKS.map((social) => {
                const Icon = social.icon;
                const value = formData.socialLinks[social.key];

                return (
                  <div key={social.key}>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
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
                          "w-full rounded-xl border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors transition-shadow focus:outline-none focus:ring-2 focus:ring-band/10",
                          value
                            ? "border-band/30 bg-band/[0.02]"
                            : "border-border bg-muted/50 focus:border-band/50",
                        )}
                      />
                      {value ? (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-band/10">
                            <Check className="w-3 h-3 text-band" />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="safe-area-inset-bottom border-t border-border bg-card/95 px-4 pb-4 pt-3 backdrop-blur-xl sm:px-5">
          <AnimatePresence {...presenceSyncNoInitial}>
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
                "touch-target flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 font-medium transition-colors transition-shadow",
                isSaving
                  ? "cursor-not-allowed border border-border bg-muted text-muted-foreground"
                  : "bg-band text-white shadow-lg shadow-band/25 hover:bg-band/90",
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
