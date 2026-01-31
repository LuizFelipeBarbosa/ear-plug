"use client";

import { useState, useEffect } from "react";
import { X, Check, Minus, Plus } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
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

export function EditBandProfileModal({
  isOpen,
  onClose,
  band,
}: EditBandProfileModalProps) {
  const updateBand = useMutation(api.bands.update);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "social">("info");

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Band name is required");
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
        socialLinks: Object.keys(cleanedSocialLinks).length > 0 ? cleanedSocialLinks : undefined,
      });

      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update band profile");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleGenre = (genre: Genre) => {
    const isSelected = formData.genres.includes(genre);
    if (isSelected) {
      setFormData({
        ...formData,
        genres: formData.genres.filter((g) => g !== genre),
      });
    } else if (formData.genres.length < 5) {
      setFormData({
        ...formData,
        genres: [...formData.genres, genre],
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-night/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal - Brutalist Style */}
      <div className="relative w-full max-w-lg bg-night-secondary border-2 border-zinc-800 sm:rounded-none max-h-[90vh] overflow-hidden animate-slide-up flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-night-secondary z-10 flex items-center justify-between p-4 border-b-2 border-zinc-800">
          <h2 className="text-lg font-bold text-white uppercase tracking-tight">
            Edit Band Profile
          </h2>
          <button
            onClick={onClose}
            className="p-2 flex items-center justify-center hover:bg-night-tertiary border border-zinc-800 hover:border-lime/30 transition-colors touch-target"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-zinc-800">
          <button
            onClick={() => setActiveTab("info")}
            className={cn(
              "flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2",
              activeTab === "info"
                ? "text-lime border-lime"
                : "text-zinc-500 border-transparent hover:text-zinc-300"
            )}
          >
            Basic Info
          </button>
          <button
            onClick={() => setActiveTab("social")}
            className={cn(
              "flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2",
              activeTab === "social"
                ? "text-lime border-lime"
                : "text-zinc-500 border-transparent hover:text-zinc-300"
            )}
          >
            Social Links
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4">
          {activeTab === "info" ? (
            <div className="space-y-6">
              {/* Band Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Band Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Your band name"
                  className="w-full px-4 py-3 bg-night-tertiary border-2 border-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:border-lime transition-colors"
                />
              </div>

              {/* Genres */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                  Genres ({formData.genres.length}/5)
                </label>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map((genre) => {
                    const isSelected = formData.genres.includes(genre.value);
                    const isDisabled = !isSelected && formData.genres.length >= 5;
                    return (
                      <button
                        key={genre.value}
                        type="button"
                        onClick={() => toggleGenre(genre.value)}
                        disabled={isDisabled}
                        className={cn(
                          "px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-2 touch-target",
                          isSelected
                            ? "text-night border-transparent"
                            : isDisabled
                              ? "bg-night-tertiary border-zinc-800 text-zinc-600 cursor-not-allowed"
                              : "bg-night-tertiary border-zinc-800 text-zinc-400 hover:border-lime/30"
                        )}
                        style={
                          isSelected
                            ? {
                                backgroundColor: GENRE_COLORS[genre.value],
                                borderColor: GENRE_COLORS[genre.value],
                              }
                            : undefined
                        }
                      >
                        {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                        {genre.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., San Francisco, CA"
                  className="w-full px-4 py-3 bg-night-tertiary border-2 border-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:border-lime transition-colors"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Bio
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell fans about your band..."
                  rows={4}
                  className="w-full px-4 py-3 bg-night-tertiary border-2 border-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:border-lime transition-colors resize-none"
                />
              </div>

              {/* Number of Members */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                  Number of Members
                </label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        memberCount: Math.max(1, formData.memberCount - 1),
                      })
                    }
                    className="w-12 h-12 flex items-center justify-center bg-night-tertiary border-2 border-zinc-800 text-zinc-400 hover:border-lime/30 hover:text-lime transition-colors touch-target"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="text-2xl font-bold text-white w-8 text-center">
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
                    className="w-12 h-12 flex items-center justify-center bg-night-tertiary border-2 border-zinc-800 text-zinc-400 hover:border-lime/30 hover:text-lime transition-colors touch-target"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {[
                { key: "spotify", label: "Spotify", placeholder: "https://open.spotify.com/artist/..." },
                { key: "appleMusic", label: "Apple Music", placeholder: "https://music.apple.com/..." },
                { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/..." },
                { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/..." },
                { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@..." },
                { key: "website", label: "Website", placeholder: "https://yourband.com" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    {label}
                  </label>
                  <input
                    type="url"
                    value={formData.socialLinks[key as keyof typeof formData.socialLinks]}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        socialLinks: {
                          ...formData.socialLinks,
                          [key]: e.target.value,
                        },
                      })
                    }
                    placeholder={placeholder}
                    className="w-full px-4 py-3 bg-night-tertiary border-2 border-zinc-800 text-white placeholder:text-zinc-500 text-sm focus:outline-none focus:border-lime transition-colors"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-red-400 text-sm text-center border-2 border-red-500/30 bg-red-500/10 p-3 mt-4">
              {error}
            </p>
          )}
        </form>

        {/* Actions */}
        <div className="p-4 border-t-2 border-zinc-800 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-night-tertiary border-2 border-zinc-800 text-zinc-300 font-bold uppercase text-xs tracking-wider hover:border-zinc-600 transition-colors touch-target"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className={cn(
              "flex-1 py-3 px-4 bg-lime text-night font-bold uppercase text-xs tracking-wider border-2 border-lime transition-all touch-target",
              isSaving ? "opacity-50 cursor-not-allowed" : "hover:bg-transparent hover:text-lime"
            )}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
