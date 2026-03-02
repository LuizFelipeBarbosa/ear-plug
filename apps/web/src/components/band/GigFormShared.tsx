"use client";

import type { ReactNode, RefObject } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Calendar,
  Check,
  Clock,
  DollarSign,
  Eye,
  EyeOff,
  FileText,
  ImageIcon,
  Music,
  Users,
  type LucideIcon,
} from "lucide-react";
import { CityAutocomplete, type VenueLocationData } from "@/components/ui/CityAutocomplete";
import { cn } from "@/lib/utils";
import { GENRES, GENRE_COLORS } from "@ear-plug/shared/constants";
import type {
  EventAddressVisibility,
  EventStatus,
  Genre,
} from "@ear-plug/shared/types";

export const MAX_EVENT_GENRES = 3;

export type GigModalTab = "details" | "lineup" | "settings";

interface GigModalTabOption {
  id: GigModalTab;
  label: string;
  icon: LucideIcon;
}

export const GIG_MODAL_TABS: GigModalTabOption[] = [
  { id: "details", label: "Details", icon: FileText },
  { id: "lineup", label: "Lineup", icon: Music },
  { id: "settings", label: "Settings", icon: Eye },
];

export interface GigFormData {
  title: string;
  date: string;
  startTime: string;
  genres: Genre[];
  capacity: string;
  price: string;
  description: string;
  status: EventStatus;
  addressVisibility: EventAddressVisibility;
}

export function createGigFormData(initialStatus: EventStatus): GigFormData {
  return {
    title: "",
    date: "",
    startTime: "",
    genres: [],
    capacity: "",
    price: "",
    description: "",
    status: initialStatus,
    addressVisibility: "public",
  };
}

export function validateGigForm(
  formData: GigFormData,
  venue: VenueLocationData | null,
  targetStatus: EventStatus = formData.status,
): Record<string, string> {
  const nextErrors: Record<string, string> = {};
  const isTentative = targetStatus === "hold";

  if (!isTentative && !formData.title.trim()) {
    nextErrors.title = "Event title is required";
  }
  if (!isTentative && !formData.date) {
    nextErrors.date = "Date is required";
  }
  if (!isTentative && !venue) {
    nextErrors.venue = "Venue location is required";
  }
  if (!isTentative && formData.genres.length === 0) {
    nextErrors.genres = "At least one genre is required";
  }
  if (formData.genres.length > MAX_EVENT_GENRES) {
    nextErrors.genres = `Select up to ${MAX_EVENT_GENRES} genres`;
  }

  if (formData.capacity.trim()) {
    const parsed = Number.parseInt(formData.capacity, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      nextErrors.capacity = "Capacity must be a positive number";
    }
  } else if (!isTentative) {
    nextErrors.capacity = "Capacity is required";
  }

  if (formData.price.trim()) {
    const parsed = Number.parseFloat(formData.price);
    if (!Number.isFinite(parsed) || parsed < 0) {
      nextErrors.price = "Price must be zero or greater";
    }
  }

  return nextErrors;
}

export function parseGigFormNumbers(formData: GigFormData): {
  capacity: number | undefined;
  price: number | undefined;
} {
  return {
    capacity: formData.capacity.trim()
      ? Number.parseInt(formData.capacity, 10)
      : undefined,
    price: formData.price.trim()
      ? Math.round(Number.parseFloat(formData.price) * 100)
      : undefined,
  };
}

interface GigModalTabsProps {
  activeTab: GigModalTab;
  onChange: (tab: GigModalTab) => void;
}

export function GigModalTabs({ activeTab, onChange }: GigModalTabsProps) {
  return (
    <div className="flex gap-1 mt-4">
      {GIG_MODAL_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all",
            activeTab === tab.id
              ? "bg-band text-white"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
        >
          <tab.icon className="w-3.5 h-3.5" />
          {tab.label}
        </button>
      ))}
    </div>
  );
}

interface GigDetailsSectionProps {
  formData: GigFormData;
  errors: Record<string, string>;
  venue: VenueLocationData | null;
  coverImage: string | null;
  isDragging: boolean;
  setIsDragging: (isDragging: boolean) => void;
  fileInputRef: RefObject<HTMLInputElement>;
  onImageSelect: (file: File) => void;
  onRemoveImage: () => void;
  onUpdateField: (field: keyof GigFormData, value: string) => void;
  onVenueChange: (venue: VenueLocationData | null) => void;
  onGenresChange: (genres: Genre[]) => void;
  clearError: (field: string) => void;
}

export function GigDetailsSection({
  formData,
  errors,
  venue,
  coverImage,
  isDragging,
  setIsDragging,
  fileInputRef,
  onImageSelect,
  onRemoveImage,
  onUpdateField,
  onVenueChange,
  onGenresChange,
  clearError,
}: GigDetailsSectionProps) {
  const isTentative = formData.status === "hold";

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-2">
          Cover Image
        </label>
        {coverImage ? (
          <div className="relative aspect-video bg-muted border border-border rounded-xl overflow-hidden group">
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
                className="px-4 py-2 bg-white text-black text-sm font-medium rounded-xl hover:bg-white/90"
              >
                Change
              </button>
              <button
                type="button"
                onClick={onRemoveImage}
                className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              const file = event.dataTransfer.files?.[0];
              if (file) {
                onImageSelect(file);
              }
            }}
            className={cn(
              "aspect-video border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors",
              isDragging
                ? "border-band bg-band/5"
                : "border-border hover:border-muted-foreground bg-muted",
            )}
          >
            <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Click or drag image here</p>
            <p className="text-xs text-muted-foreground mt-1">Max 5MB</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              onImageSelect(file);
            }
          }}
          className="hidden"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-2">
          Event Title {!isTentative && <span className="text-band">*</span>}
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(event) => onUpdateField("title", event.target.value)}
          className={cn(
            "w-full px-4 py-3 bg-muted border rounded-xl text-foreground focus:outline-none transition-colors",
            errors.title ? "border-red-500" : "border-border focus:border-band",
          )}
        />
        {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-2">
            Date {!isTentative && <span className="text-band">*</span>}
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="date"
              value={formData.date}
              onChange={(event) => onUpdateField("date", event.target.value)}
              className={cn(
                "w-full pl-10 pr-3 py-3 bg-muted border rounded-xl text-foreground focus:outline-none",
                errors.date ? "border-red-500" : "border-border focus:border-band",
              )}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-2">
            Start Time
          </label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="time"
              value={formData.startTime}
              onChange={(event) => onUpdateField("startTime", event.target.value)}
              className="w-full pl-10 pr-3 py-3 bg-muted border border-border rounded-xl text-foreground focus:outline-none focus:border-band"
            />
          </div>
        </div>
      </div>

      <CityAutocomplete
        mode="venue"
        value={venue}
        onChange={(value) => {
          const selectedVenue = value as VenueLocationData | null;
          onVenueChange(selectedVenue);
          if (selectedVenue && errors.venue) {
            clearError("venue");
          }
        }}
        label="Venue Location"
        placeholder="Search for a venue..."
        required={!isTentative}
        error={errors.venue}
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-2">
            Capacity {!isTentative && <span className="text-band">*</span>}
          </label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="number"
              min="1"
              value={formData.capacity}
              onChange={(event) => onUpdateField("capacity", event.target.value)}
              className={cn(
                "w-full pl-10 pr-3 py-3 bg-muted border rounded-xl text-foreground focus:outline-none",
                errors.capacity ? "border-red-500" : "border-border focus:border-band",
              )}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-2">
            Price ($)
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(event) => onUpdateField("price", event.target.value)}
              placeholder="0.00"
              className="w-full pl-10 pr-3 py-3 bg-muted border border-border rounded-xl text-foreground focus:outline-none focus:border-band"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-2">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(event) => onUpdateField("description", event.target.value)}
          placeholder="Tell fans about the show..."
          rows={4}
          className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-band resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-2">
          Genres ({formData.genres.length}/{MAX_EVENT_GENRES})
          {!isTentative && <span className="text-band">*</span>}
        </label>
        <div
          className={cn(
            "grid grid-cols-2 gap-2 p-3 bg-muted border rounded-xl",
            errors.genres ? "border-red-500" : "border-border",
          )}
        >
          {GENRES.map((genreOption) => {
            const isSelected = formData.genres.includes(genreOption.value);
            const isDisabled =
              !isSelected && formData.genres.length >= MAX_EVENT_GENRES;
            const genreColor = GENRE_COLORS[genreOption.value];

            return (
              <button
                key={genreOption.value}
                type="button"
                disabled={isDisabled}
                onClick={() => {
                  const nextGenres = isSelected
                    ? formData.genres.filter((genre) => genre !== genreOption.value)
                    : formData.genres.length < MAX_EVENT_GENRES
                      ? [...formData.genres, genreOption.value]
                      : formData.genres;
                  onGenresChange(nextGenres);
                  if (errors.genres) {
                    clearError("genres");
                  }
                }}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-lg transition-all",
                  isSelected
                    ? "text-white"
                    : isDisabled
                      ? "bg-card text-muted-foreground cursor-not-allowed"
                      : "hover:brightness-110",
                )}
                style={
                  isSelected
                    ? { backgroundColor: genreColor }
                    : isDisabled
                      ? undefined
                      : {
                          backgroundColor: `${genreColor}20`,
                          color: genreColor,
                        }
                }
              >
                {genreOption.label}
              </button>
            );
          })}
        </div>
        {errors.genres && (
          <p className="text-xs text-red-500 mt-1">{errors.genres}</p>
        )}
      </div>
    </motion.div>
  );
}

interface GigSettingsSectionProps {
  formData: Pick<GigFormData, "status" | "addressVisibility">;
  onStatusChange: (status: EventStatus) => void;
  onAddressVisibilityChange: (visibility: EventAddressVisibility) => void;
  dangerSlot?: ReactNode;
}

export function GigSettingsSection({
  formData,
  onStatusChange,
  onAddressVisibilityChange,
  dangerSlot,
}: GigSettingsSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-2">
          Event Status
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onStatusChange("confirmed")}
            className={cn(
              "px-4 py-3 text-sm font-medium rounded-xl border-2 transition-all",
              formData.status === "confirmed"
                ? "bg-success text-white border-success"
                : "bg-card border-border text-muted-foreground hover:border-success/50",
            )}
          >
            <Check className="w-4 h-4 inline mr-2" />
            Confirmed
          </button>
          <button
            type="button"
            onClick={() => onStatusChange("hold")}
            className={cn(
              "px-4 py-3 text-sm font-medium rounded-xl border-2 transition-all",
              formData.status === "hold"
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-card border-border text-muted-foreground hover:border-amber-500/50",
            )}
          >
            <AlertCircle className="w-4 h-4 inline mr-2" />
            Tentative
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-2">
          Address Visibility
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onAddressVisibilityChange("public")}
            className={cn(
              "px-4 py-3 text-sm font-medium rounded-xl border-2 transition-all flex items-center justify-center gap-2",
              formData.addressVisibility === "public"
                ? "bg-band text-white border-band"
                : "bg-card border-border text-muted-foreground hover:border-band/50",
            )}
          >
            <Eye className="w-4 h-4" />
            Public
          </button>
          <button
            type="button"
            onClick={() => onAddressVisibilityChange("rsvp_only")}
            className={cn(
              "px-4 py-3 text-sm font-medium rounded-xl border-2 transition-all flex items-center justify-center gap-2",
              formData.addressVisibility === "rsvp_only"
                ? "bg-band text-white border-band"
                : "bg-card border-border text-muted-foreground hover:border-band/50",
            )}
          >
            <EyeOff className="w-4 h-4" />
            RSVP Only
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          RSVP-only hides the street address until fans RSVP
        </p>
      </div>

      {dangerSlot}
    </motion.div>
  );
}
