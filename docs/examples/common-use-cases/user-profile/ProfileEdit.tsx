/**
 * Profile Edit Component
 *
 * Editable form for user profile information.
 * Handles form state, validation, and submission to Convex.
 *
 * Features:
 * - Form state management with useState
 * - Optimistic UI updates
 * - Error handling and display
 * - Genre multi-select
 * - Avatar preview
 */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/useUser";
import { GENRES } from "@ear-plug/shared/constants";
import type { Genre } from "@ear-plug/shared/types";
import { cn } from "@/lib/utils";

/**
 * Profile edit form component.
 *
 * @example
 * // In a page component
 * export default function EditProfilePage() {
 *   return <ProfileEdit />;
 * }
 */
export function ProfileEdit() {
  const router = useRouter();
  const { user, isLoading, updateProfile } = useCurrentUser();

  // Form state
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [avatar, setAvatar] = useState("");
  const [topGenres, setTopGenres] = useState<Genre[]>([]);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Populate form with existing user data
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setLocation(user.location || "");
      setAvatar(user.avatar || "");
      setTopGenres((user.topGenres as Genre[]) || []);
    }
  }, [user]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!name.trim()) {
        throw new Error("Name is required");
      }

      // Submit to Convex
      await updateProfile({
        name: name.trim(),
        location: location.trim() || undefined,
        avatar: avatar.trim() || undefined,
        topGenres: topGenres.length > 0 ? topGenres : undefined,
      });

      setSuccess(true);

      // Optionally redirect after success
      // router.push("/profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle a genre in the selection
  const toggleGenre = (genre: Genre) => {
    setTopGenres((prev) => {
      if (prev.includes(genre)) {
        return prev.filter((g) => g !== genre);
      }
      if (prev.length >= 5) {
        // Limit to 5 genres
        return prev;
      }
      return [...prev, genre];
    });
  };

  if (isLoading) {
    return <FormSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-zinc-500">Please sign in to edit your profile.</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Edit Profile</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="p-4 bg-green-500/10 border border-green-500 text-green-400 text-sm">
            Profile updated successfully!
          </div>
        )}

        {/* Avatar Preview and URL Input */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-zinc-400">
            Profile Photo
          </label>
          <div className="flex items-center gap-4">
            {/* Preview */}
            <div className="flex-shrink-0">
              {avatar ? (
                <img
                  src={avatar}
                  alt="Avatar preview"
                  className="w-20 h-20 rounded-full object-cover border-2 border-zinc-700"
                  onError={() => setAvatar("")}
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-night-tertiary border-2 border-zinc-700 flex items-center justify-center">
                  <span className="text-2xl font-bold text-zinc-500">
                    {name.charAt(0).toUpperCase() || "?"}
                  </span>
                </div>
              )}
            </div>
            {/* URL Input */}
            <div className="flex-1">
              <input
                type="url"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="w-full px-3 py-2 bg-night-tertiary border border-zinc-800 text-white placeholder-zinc-500 focus:border-lime outline-none"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Enter a URL for your profile photo
              </p>
            </div>
          </div>
        </div>

        {/* Name Input */}
        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm font-medium text-zinc-400">
            Display Name *
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
            className="w-full px-3 py-2 bg-night-tertiary border border-zinc-800 text-white focus:border-lime outline-none"
          />
        </div>

        {/* Location Input */}
        <div className="space-y-2">
          <label htmlFor="location" className="block text-sm font-medium text-zinc-400">
            Location
          </label>
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Oakland, CA"
            maxLength={200}
            className="w-full px-3 py-2 bg-night-tertiary border border-zinc-800 text-white placeholder-zinc-500 focus:border-lime outline-none"
          />
        </div>

        {/* Genre Selection (for fans) */}
        {user.role === "fan" && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-zinc-400">
              Favorite Genres
              <span className="text-zinc-500 font-normal ml-2">
                (select up to 5)
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((genre) => {
                const isSelected = topGenres.includes(genre.value);
                const isDisabled = !isSelected && topGenres.length >= 5;

                return (
                  <button
                    key={genre.value}
                    type="button"
                    onClick={() => toggleGenre(genre.value)}
                    disabled={isDisabled}
                    className={cn(
                      "px-4 py-2 text-sm font-medium transition-colors border",
                      isSelected
                        ? "bg-lime text-night border-lime"
                        : isDisabled
                          ? "bg-transparent text-zinc-600 border-zinc-800 cursor-not-allowed"
                          : "bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500"
                    )}
                  >
                    {genre.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-zinc-500">
              {topGenres.length}/5 genres selected
            </p>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex items-center gap-4 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-lime text-night font-bold hover:bg-lime/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Controlled input component with validation.
 * Demonstrates input patterns for reuse.
 */
export function ValidatedInput({
  label,
  value,
  onChange,
  required = false,
  maxLength,
  placeholder,
  type = "text",
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  type?: "text" | "email" | "url";
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-zinc-400">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        className={cn(
          "w-full px-3 py-2 bg-night-tertiary border text-white focus:outline-none",
          error
            ? "border-red-500 focus:border-red-500"
            : "border-zinc-800 focus:border-lime"
        )}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {maxLength && (
        <p className="text-xs text-zinc-500 text-right">
          {value.length}/{maxLength}
        </p>
      )}
    </div>
  );
}

/**
 * Form skeleton loader.
 */
function FormSkeleton() {
  return (
    <div className="max-w-xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 w-40 bg-zinc-800 rounded" />

      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-zinc-800" />
        <div className="flex-1 h-10 bg-zinc-800 rounded" />
      </div>

      <div className="space-y-2">
        <div className="h-4 w-24 bg-zinc-800 rounded" />
        <div className="h-10 bg-zinc-800 rounded" />
      </div>

      <div className="space-y-2">
        <div className="h-4 w-24 bg-zinc-800 rounded" />
        <div className="h-10 bg-zinc-800 rounded" />
      </div>

      <div className="flex gap-4">
        <div className="h-10 w-32 bg-zinc-800 rounded" />
        <div className="h-10 w-24 bg-zinc-800 rounded" />
      </div>
    </div>
  );
}
