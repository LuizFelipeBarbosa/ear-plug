"use client";

import { useState, useEffect } from "react";
import { X, Camera, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { GENRES, GENRE_COLORS } from "@ear-plug/shared/constants";
import type { Genre } from "@ear-plug/shared/types";

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

export function EditProfileModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: EditProfileModalProps) {
  const [formData, setFormData] = useState<ProfileFormData>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(initialData);
      setError(null);
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Name is required");
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

  const toggleGenre = (genre: Genre) => {
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
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal - Brutalist Style */}
      <div className="relative w-full max-w-lg bg-card border-2 border-border sm:rounded-none max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-card z-10 flex items-center justify-between p-4 border-b-2 border-border">
          <h2 className="text-lg font-bold text-foreground">Edit Profile</h2>
          <button
            onClick={onClose}
            className="p-2 flex items-center justify-center hover:bg-muted border border-border hover:border-fan/30 transition-colors touch-target"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-24 h-24 overflow-hidden bg-muted border-2 border-fan/30">
                {formData.avatar ? (
                  <img
                    src={formData.avatar}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-fan">
                    {formData.name?.charAt(0).toUpperCase() || "?"}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="absolute bottom-0 right-0 p-2 flex items-center justify-center bg-fan text-foreground border-2 border-border hover:bg-fan-600 transition-colors touch-target"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2  ">
              Avatar is synced from your account
            </p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-bold   text-muted-foreground mb-2">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Your name"
              className="w-full px-4 py-3 bg-muted border-2 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-fan transition-colors"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-bold   text-muted-foreground mb-2">
              Location
            </label>
            <input
              type="text"
              value={formData.location || ""}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              placeholder="e.g., San Francisco, CA"
              className="w-full px-4 py-3 bg-muted border-2 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-fan transition-colors"
            />
          </div>

          {/* Top Genres */}
          <div>
            <label className="block text-xs font-bold   text-muted-foreground mb-3">
              Top Genres (select up to 5)
            </label>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((genre) => {
                const isSelected = formData.topGenres?.includes(genre.value);
                return (
                  <button
                    key={genre.value}
                    type="button"
                    onClick={() => toggleGenre(genre.value)}
                    className={cn(
                      "px-4 py-2 text-xs font-bold   transition-all border-2 touch-target",
                      isSelected
                        ? "text-foreground border-transparent"
                        : "bg-muted border-border text-muted-foreground hover:border-fan/30",
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

          {/* Error */}
          {error && (
            <p className="text-red-400 text-sm text-center border-2 border-red-500/30 bg-red-500/10 p-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-muted border-2 border-border text-muted-foreground font-bold  text-xs  hover:border-zinc-600 transition-colors touch-target"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={cn(
                "flex-1 py-3 px-4 bg-fan text-foreground font-bold  text-xs  border-2 border-fan transition-all touch-target",
                isSaving
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-transparent hover:text-fan",
              )}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
