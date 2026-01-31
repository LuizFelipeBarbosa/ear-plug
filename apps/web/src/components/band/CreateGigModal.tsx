"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import {
  X,
  Calendar,
  Clock,
  Upload,
  ImageIcon,
  MapPin,
  Users,
  FileText,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PlaceAutocomplete, VenueLocationData } from "@/components/maps/PlaceAutocomplete";
import { useSharedEvents } from "@/hooks/useSharedEvents";
import { GENRES } from "@ear-plug/shared/constants";
import type { Genre } from "@ear-plug/shared/types";

interface CreateGigModalProps {
  isOpen: boolean;
  onClose: () => void;
  bandId: string;
  bandName: string;
  onSuccess?: () => void;
}

// Toast notification type
interface Toast {
  id: string;
  message: string;
  type: "success" | "error";
}

/**
 * Create Gig Modal Component
 * 
 * A comprehensive form for bands to create new gigs with:
 * - Cover image upload/preview
 * - Date and time selection
 * - Google Maps Places Autocomplete for venue
 * - Genre selection
 * - Capacity and description
 * - Form validation
 */
export function CreateGigModal({
  isOpen,
  onClose,
  bandId,
  bandName,
  onSuccess,
}: CreateGigModalProps) {
  const { createEvent } = useSharedEvents();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    date: "",
    startTime: "",
    endTime: "",
    genres: [] as Genre[],
    capacity: "",
    description: "",
  });

  // Venue state from autocomplete
  const [venue, setVenue] = useState<VenueLocationData | null>(null);

  // Image state
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Show toast notification
  const showToast = useCallback((message: string, type: "success" | "error") => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Reset form
  const resetForm = useCallback(() => {
    setFormData({
      title: "",
      date: "",
      startTime: "",
      endTime: "",
      genres: [],
      capacity: "",
      description: "",
    });
    setVenue(null);
    setCoverImage(null);
    setErrors({});
  }, []);

  // Handle close with reset
  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  // Update form field
  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle image file selection
  const handleImageSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      showToast("Please select an image file", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image must be less than 5MB", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setCoverImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageSelect(file);
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageSelect(file);
  };

  // Remove cover image
  const removeImage = () => {
    setCoverImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Event title is required";
    }

    if (!formData.date) {
      newErrors.date = "Date is required";
    } else {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.date = "Date cannot be in the past";
      }
    }

    if (!formData.startTime) {
      newErrors.startTime = "Start time is required";
    }

    if (!venue) {
      newErrors.venue = "Please select a venue location";
    }

    if (formData.genres.length === 0) {
      newErrors.genres = "At least one genre is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !venue) return;

    setIsSubmitting(true);

    try {
      // Create the event in Convex (venue is created/found automatically)
      await createEvent({
        title: formData.title.trim(),
        bandId,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime || undefined,
        venue: {
          name: venue.name,
          address: venue.address,
          city: venue.city,
          coordinates: venue.coordinates,
          placeId: venue.placeId,
        },
        image: coverImage || undefined,
        genres: formData.genres,
        capacity: formData.capacity ? parseInt(formData.capacity, 10) : undefined,
        description: formData.description.trim() || undefined,
      });

      showToast("Gig created successfully!", "success");
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error("Failed to create gig:", error);
      showToast("Failed to create gig. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Modal Overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal Content */}
        <div className="relative w-full max-w-lg max-h-[90vh] bg-night-secondary border-2 border-zinc-800 shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b-2 border-zinc-800 bg-night-tertiary">
            <div>
              <h2 className="text-lg font-bold uppercase tracking-tight text-white">
                Create Confirmed Gig
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Add a new show to your calendar
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 flex items-center justify-center hover:bg-zinc-800 border border-zinc-800 hover:border-lime/30 transition-colors touch-target"
              disabled={isSubmitting}
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto p-4 space-y-5"
          >
            {/* Cover Image Upload */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Cover Image
              </label>
              {coverImage ? (
                <div className="relative aspect-video bg-night-tertiary border-2 border-zinc-800 overflow-hidden group">
                  <Image
                    src={coverImage}
                    alt="Cover preview"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-lime text-night text-sm font-bold uppercase tracking-wider hover:bg-lime/90 transition-colors"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={removeImage}
                      className="px-4 py-2 bg-red-500 text-white text-sm font-bold uppercase tracking-wider hover:bg-red-600 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                    "aspect-video border-2 border-dashed rounded-none flex flex-col items-center justify-center cursor-pointer transition-colors",
                    isDragging
                      ? "border-lime bg-lime/5"
                      : "border-zinc-700 hover:border-zinc-600 bg-night-tertiary"
                  )}
                >
                  <div className="w-16 h-16 bg-night border-2 border-zinc-800 flex items-center justify-center mb-3">
                    <ImageIcon className="w-8 h-8 text-zinc-600" />
                  </div>
                  <p className="text-sm font-medium text-zinc-400">
                    Click or drag image here
                  </p>
                  <p className="text-xs text-zinc-600 mt-1">Max 5MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>

            {/* Event Title */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Event Title <span className="text-lime">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="e.g., Summer Solstice Show"
                className={cn(
                  "w-full px-4 py-3.5 bg-night-tertiary border-2 rounded-none text-white placeholder:text-zinc-600 focus:outline-none transition-colors",
                  errors.title
                    ? "border-red-500 focus:border-red-400"
                    : "border-zinc-800 focus:border-lime"
                )}
              />
              {errors.title && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.title}
                </p>
              )}
            </div>

            {/* Date & Time Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Date */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Date <span className="text-lime">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Calendar className="w-5 h-5 text-zinc-600" />
                  </div>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => updateField("date", e.target.value)}
                    className={cn(
                      "w-full pl-12 pr-4 py-3.5 bg-night-tertiary border-2 rounded-none text-white focus:outline-none transition-colors appearance-none",
                      errors.date
                        ? "border-red-500 focus:border-red-400"
                        : "border-zinc-800 focus:border-lime"
                    )}
                  />
                </div>
                {errors.date && (
                  <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.date}
                  </p>
                )}
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Start Time <span className="text-lime">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Clock className="w-5 h-5 text-zinc-600" />
                  </div>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => updateField("startTime", e.target.value)}
                    className={cn(
                      "w-full pl-12 pr-4 py-3.5 bg-night-tertiary border-2 rounded-none text-white focus:outline-none transition-colors appearance-none",
                      errors.startTime
                        ? "border-red-500 focus:border-red-400"
                        : "border-zinc-800 focus:border-lime"
                    )}
                  />
                </div>
                {errors.startTime && (
                  <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.startTime}
                  </p>
                )}
              </div>
            </div>

            {/* End Time */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                End Time <span className="text-zinc-600">(Optional)</span>
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Clock className="w-5 h-5 text-zinc-600" />
                </div>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => updateField("endTime", e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-night-tertiary border-2 border-zinc-800 rounded-none text-white focus:outline-none focus:border-lime transition-colors appearance-none"
                />
              </div>
            </div>

            {/* Venue Location - Google Maps Autocomplete */}
            <div>
              <PlaceAutocomplete
                value={venue}
                onChange={(newVenue) => {
                  setVenue(newVenue);
                  if (newVenue && errors.venue) {
                    setErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.venue;
                      return newErrors;
                    });
                  }
                }}
                label="Venue Location"
                placeholder="Search for a venue..."
                required
                error={errors.venue}
              />
            </div>

            {/* Genre Selection - Multi-select */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Genres <span className="text-lime">*</span>
                <span className="text-zinc-600 font-normal ml-2">(select all that apply)</span>
              </label>
              <div className={cn(
                "grid grid-cols-2 gap-2 p-3 bg-night-tertiary border-2 rounded-none",
                errors.genres ? "border-red-500" : "border-zinc-800"
              )}>
                {GENRES.map((g) => {
                  const isSelected = formData.genres.includes(g.value);
                  return (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => {
                        const newGenres = isSelected
                          ? formData.genres.filter((genre) => genre !== g.value)
                          : [...formData.genres, g.value];
                        setFormData((prev) => ({ ...prev, genres: newGenres }));
                        if (errors.genres) {
                          setErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors.genres;
                            return newErrors;
                          });
                        }
                      }}
                      className={cn(
                        "px-3 py-2 text-sm font-medium uppercase tracking-wider border-2 transition-all",
                        isSelected
                          ? "bg-lime text-night border-lime"
                          : "bg-night border-zinc-700 text-zinc-400 hover:border-zinc-600"
                      )}
                    >
                      {g.label}
                    </button>
                  );
                })}
              </div>
              {errors.genres && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.genres}
                </p>
              )}
            </div>

            {/* Capacity */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Capacity <span className="text-zinc-600">(Optional)</span>
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Users className="w-5 h-5 text-zinc-600" />
                </div>
                <input
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={(e) => updateField("capacity", e.target.value)}
                  placeholder="e.g., 200"
                  className="w-full pl-12 pr-4 py-3.5 bg-night-tertiary border-2 border-zinc-800 rounded-none text-white placeholder:text-zinc-600 focus:outline-none focus:border-lime transition-colors"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Description <span className="text-zinc-600">(Optional)</span>
              </label>
              <div className="relative">
                <div className="absolute left-4 top-4 pointer-events-none">
                  <FileText className="w-5 h-5 text-zinc-600" />
                </div>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Tell fans about the show..."
                  rows={4}
                  className="w-full pl-12 pr-4 py-3.5 bg-night-tertiary border-2 border-zinc-800 rounded-none text-white placeholder:text-zinc-600 focus:outline-none focus:border-lime transition-colors resize-none"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2 pb-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  "w-full py-4 font-bold uppercase tracking-wider text-sm border-2 transition-all touch-target flex items-center justify-center gap-2",
                  isSubmitting
                    ? "bg-zinc-800 text-zinc-500 border-zinc-800 cursor-not-allowed"
                    : "bg-lime text-night border-lime hover:bg-transparent hover:text-lime"
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Create Gig
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-[60] space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "px-4 py-3 border-2 shadow-lg flex items-center gap-3 animate-in slide-in-from-right",
              toast.type === "success"
                ? "bg-night-secondary border-lime"
                : "bg-night-secondary border-red-500"
            )}
          >
            {toast.type === "success" ? (
              <Check className="w-5 h-5 text-lime flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            )}
            <p
              className={cn(
                "text-sm font-medium",
                toast.type === "success" ? "text-white" : "text-red-400"
              )}
            >
              {toast.message}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
