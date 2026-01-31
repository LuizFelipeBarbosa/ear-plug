"use client";

import { useState, useEffect } from "react";
import { X, Camera, Check } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { GENRES } from "@ear-plug/shared/constants";
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-white dark:bg-surface-dark rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-hidden animate-slide-up flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Edit Band Profile
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setActiveTab("info")}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors",
              activeTab === "info"
                ? "text-accent-600 border-b-2 border-accent-600"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            Basic Info
          </button>
          <button
            onClick={() => setActiveTab("social")}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors",
              activeTab === "social"
                ? "text-accent-600 border-b-2 border-accent-600"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            Social Links
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4">
          {activeTab === "info" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Band Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Genres ({formData.genres.length}/5)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {GENRES.map(({ value, label }) => {
                    const isSelected = formData.genres.includes(value);
                    const isDisabled = !isSelected && formData.genres.length >= 5;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setFormData({
                              ...formData,
                              genres: formData.genres.filter((g) => g !== value),
                            });
                          } else if (!isDisabled) {
                            setFormData({
                              ...formData,
                              genres: [...formData.genres, value],
                            });
                          }
                        }}
                        disabled={isDisabled}
                        className={cn(
                          "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                          isSelected
                            ? "bg-accent-500 text-white"
                            : isDisabled
                              ? "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bio
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Number of Members
                </label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, memberCount: Math.max(1, formData.memberCount - 1) })}
                    className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 font-bold"
                  >
                    -
                  </button>
                  <span className="text-xl font-bold text-gray-900 dark:text-white">
                    {formData.memberCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, memberCount: formData.memberCount + 1 })}
                    className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 font-bold"
                  >
                    +
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                    className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>
              ))}
            </div>
          )}

          {error && (
            <p className="text-red-500 text-sm text-center mt-4">{error}</p>
          )}
        </form>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className={cn(
              "flex-1 py-3 px-4 bg-accent-500 text-white font-medium rounded-xl",
              isSaving ? "opacity-50" : "hover:bg-accent-600"
            )}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
