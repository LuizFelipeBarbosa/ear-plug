"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  Clock,
  ImageIcon,
  Users,
  FileText,
  Check,
  AlertCircle,
  Loader2,
  DollarSign,
  Eye,
  EyeOff,
  Music,
  UserPlus,
  MapPin,
  Clock3,
} from "lucide-react";
import { useQuery } from "convex/react";
import { cn } from "@/lib/utils";
import {
  CityAutocomplete,
  type VenueLocationData,
} from "@/components/ui/CityAutocomplete";
import { useSharedEvents } from "@/hooks/useSharedEvents";
import { api } from "../../../../../convex/_generated/api";
import { GENRES, GENRE_COLORS } from "@ear-plug/shared/constants";
import type {
  EventAddressVisibility,
  EventStatus,
  Genre,
} from "@ear-plug/shared/types";

const MAX_EVENT_GENRES = 3;

interface CreateGigModalProps {
  isOpen: boolean;
  onClose: () => void;
  bandId: string;
  bandName: string;
  creationKind: "tentative" | "confirmed";
  onSuccess?: () => void;
}

export function CreateGigModal({
  isOpen,
  onClose,
  bandId,
  bandName,
  creationKind,
  onSuccess,
}: CreateGigModalProps) {
  const { createEvent } = useSharedEvents();
  const isTentative = creationKind === "tentative";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"details" | "lineup" | "settings">("details");

  const [formData, setFormData] = useState({
    title: "",
    date: "",
    startTime: "",
    genres: [] as Genre[],
    capacity: "",
    price: "",
    description: "",
    status: (isTentative ? "hold" : "confirmed") as EventStatus,
    addressVisibility: "public" as EventAddressVisibility,
  });

  const [venue, setVenue] = useState<VenueLocationData | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cohostSearch, setCohostSearch] = useState("");
  const [selectedCohostBandIds, setSelectedCohostBandIds] = useState<string[]>([]);

  const allBands = useQuery(api.bands.list, { limit: 100 });

  const selectedCohostBands = useMemo(
    () =>
      (allBands ?? []).filter((candidateBand) =>
        selectedCohostBandIds.includes(candidateBand._id),
      ),
    [allBands, selectedCohostBandIds],
  );

  const cohostResults = useMemo(() => {
    const normalizedQuery = cohostSearch.trim().toLowerCase();
    if (!normalizedQuery) return [];
    return (allBands ?? [])
      .filter((candidateBand) => candidateBand._id !== bandId)
      .filter((candidateBand) => !selectedCohostBandIds.includes(candidateBand._id))
      .filter((candidateBand) =>
        candidateBand.name.toLowerCase().includes(normalizedQuery),
      )
      .slice(0, 8);
  }, [allBands, bandId, cohostSearch, selectedCohostBandIds]);

  // Reset form when modal opens with different creation kind
  useEffect(() => {
    if (isOpen) {
      setFormData((prev) => ({
        ...prev,
        status: (isTentative ? "hold" : "confirmed") as EventStatus,
      }));
      setActiveTab("details");
    }
  }, [isOpen, isTentative]);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleImageSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setSubmitError("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSubmitError("Image must be less than 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setCoverImage(e.target?.result as string);
      setSubmitError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageSelect(file);
  };

  const removeImage = () => {
    setCoverImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateForm = (): boolean => {
    const nextErrors: Record<string, string> = {};
    const targetIsTentative = formData.status === "hold";
    if (!targetIsTentative && !formData.title.trim()) {
      nextErrors.title = "Event title is required";
    }
    if (!targetIsTentative && !formData.date) {
      nextErrors.date = "Date is required";
    }
    if (!targetIsTentative && !venue) {
      nextErrors.venue = "Venue location is required";
    }
    if (!targetIsTentative && formData.genres.length === 0) {
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
    } else if (!targetIsTentative) {
      nextErrors.capacity = "Capacity is required";
    }
    if (formData.price.trim()) {
      const parsed = Number.parseFloat(formData.price);
      if (!Number.isFinite(parsed) || parsed < 0) {
        nextErrors.price = "Price must be zero or greater";
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const parsedCapacity = formData.capacity.trim()
        ? Number.parseInt(formData.capacity, 10)
        : undefined;
      const parsedPrice = formData.price.trim()
        ? Math.round(Number.parseFloat(formData.price) * 100)
        : undefined;

      await createEvent({
        title: formData.title.trim() || undefined,
        bandId,
        cohostBandIds:
          selectedCohostBandIds.length > 0 ? selectedCohostBandIds : undefined,
        date: formData.date || undefined,
        startTime: formData.startTime || undefined,
        venue: venue
          ? {
              name: venue.name,
              address: venue.address,
              city: venue.city,
              coordinates: venue.coordinates,
              placeId: venue.placeId,
              capacity: venue.capacity,
            }
          : undefined,
        image: coverImage || undefined,
        genres: formData.genres.length > 0 ? formData.genres : undefined,
        capacity: parsedCapacity,
        description: formData.description.trim(),
        price: parsedPrice,
        status: formData.status,
        addressVisibility: formData.addressVisibility,
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to create event"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: "details" as const, label: "Details", icon: FileText },
    { id: "lineup" as const, label: "Lineup", icon: Music },
    { id: "settings" as const, label: "Settings", icon: Eye },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative w-full max-w-lg max-h-[90vh] bg-card border border-border sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-xl border-b border-border p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border-2",
                  isTentative
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-500"
                    : "bg-emerald-500/10 border-emerald-500/40 text-emerald-500"
                )}
              >
                {isTentative ? (
                  <Clock3 className="w-6 h-6" />
                ) : (
                  <Check className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-foreground">
                    {isTentative ? "Create Tentative Gig" : "Create Confirmed Gig"}
                  </h2>
                  <span
                    className={cn(
                      "px-2 py-0.5 text-[10px] font-bold rounded-full border",
                      isTentative
                        ? "bg-amber-500/10 text-amber-600 border-amber-500/40"
                        : "bg-emerald-500/10 text-emerald-600 border-emerald-500/40"
                    )}
                  >
                    {isTentative ? "Draft" : "Published"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Add a new show for {bandName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-2 bg-muted border border-border rounded-xl text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all",
                  activeTab === tab.id
                    ? "bg-band text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {submitError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Details Tab */}
          {activeTab === "details" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Image */}
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
                        onClick={removeImage}
                        className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleImageSelect(file);
                    }}
                    className={cn(
                      "aspect-video border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors",
                      isDragging
                        ? "border-band bg-band/5"
                        : "border-border hover:border-muted-foreground bg-muted"
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
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-2">
                  Event Title {formData.status !== "hold" && <span className="text-band">*</span>}
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  className={cn(
                    "w-full px-4 py-3 bg-muted border rounded-xl text-foreground focus:outline-none transition-colors",
                    errors.title ? "border-red-500" : "border-border focus:border-band"
                  )}
                />
                {errors.title && (
                  <p className="text-xs text-red-500 mt-1">{errors.title}</p>
                )}
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-2">
                    Date {formData.status !== "hold" && <span className="text-band">*</span>}
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => updateField("date", e.target.value)}
                      className={cn(
                        "w-full pl-10 pr-3 py-3 bg-muted border rounded-xl text-foreground focus:outline-none",
                        errors.date ? "border-red-500" : "border-border focus:border-band"
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
                      onChange={(e) => updateField("startTime", e.target.value)}
                      className="w-full pl-10 pr-3 py-3 bg-muted border border-border rounded-xl text-foreground focus:outline-none focus:border-band"
                    />
                  </div>
                </div>
              </div>

              {/* Venue */}
              <CityAutocomplete
                mode="venue"
                value={venue}
                onChange={(v) => {
                  setVenue(v as VenueLocationData | null);
                  if (v && errors.venue) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.venue;
                      return next;
                    });
                  }
                }}
                label="Venue Location"
                placeholder="Search for a venue..."
                required={formData.status !== "hold"}
                error={errors.venue}
              />

              {/* Capacity & Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-2">
                    Capacity {formData.status !== "hold" && <span className="text-band">*</span>}
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="number"
                      min="1"
                      value={formData.capacity}
                      onChange={(e) => updateField("capacity", e.target.value)}
                      className={cn(
                        "w-full pl-10 pr-3 py-3 bg-muted border rounded-xl text-foreground focus:outline-none",
                        errors.capacity ? "border-red-500" : "border-border focus:border-band"
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
                      onChange={(e) => updateField("price", e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-10 pr-3 py-3 bg-muted border border-border rounded-xl text-foreground focus:outline-none focus:border-band"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Tell fans about the show..."
                  rows={4}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-band resize-none"
                />
              </div>

              {/* Genres */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-2">
                  Genres ({formData.genres.length}/{MAX_EVENT_GENRES})
                  {formData.status !== "hold" && <span className="text-band">*</span>}
                </label>
                <div
                  className={cn(
                    "grid grid-cols-2 gap-2 p-3 bg-muted border rounded-xl",
                    errors.genres ? "border-red-500" : "border-border"
                  )}
                >
                  {GENRES.map((genreOption) => {
                    const isSelected = formData.genres.includes(genreOption.value);
                    const isDisabled = !isSelected && formData.genres.length >= MAX_EVENT_GENRES;
                    const genreColor = GENRE_COLORS[genreOption.value];
                    return (
                      <button
                        key={genreOption.value}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => {
                          const nextGenres = isSelected
                            ? formData.genres.filter((g) => g !== genreOption.value)
                            : formData.genres.length < MAX_EVENT_GENRES
                            ? [...formData.genres, genreOption.value]
                            : formData.genres;
                          setFormData((prev) => ({ ...prev, genres: nextGenres }));
                          if (errors.genres) {
                            setErrors((prev) => {
                              const next = { ...prev };
                              delete next.genres;
                              return next;
                            });
                          }
                        }}
                        className={cn(
                          "px-3 py-2 text-sm font-medium rounded-lg transition-all",
                          isSelected
                            ? "text-white"
                            : isDisabled
                            ? "bg-card text-muted-foreground cursor-not-allowed"
                            : "hover:brightness-110"
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
                {errors.genres && <p className="text-xs text-red-500 mt-1">{errors.genres}</p>}
              </div>
            </motion.div>
          )}

          {/* Lineup Tab */}
          {activeTab === "lineup" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Current Lineup */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Current Lineup</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-band/10 border border-band/30 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-band/20 rounded-lg flex items-center justify-center">
                        <Music className="w-5 h-5 text-band" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{bandName}</p>
                        <p className="text-xs text-band">Host Band</p>
                      </div>
                    </div>
                  </div>

                  {selectedCohostBands.map((band) => (
                    <div
                      key={band._id}
                      className="flex items-center justify-between p-3 bg-card border border-border rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                          <Music className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{band.name}</p>
                          <p className="text-xs text-muted-foreground">Co-host</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedCohostBandIds((prev) => prev.filter((id) => id !== band._id))
                        }
                        className="px-3 py-1.5 text-xs text-red-500 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Co-host */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Invite Co-host</h3>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={cohostSearch}
                    onChange={(e) => setCohostSearch(e.target.value)}
                    placeholder="Search bands..."
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-band"
                  />
                  {cohostResults.length > 0 && (
                    <div className="border border-border rounded-xl overflow-hidden">
                      {cohostResults.map((band) => (
                        <button
                          key={band._id}
                          type="button"
                          onClick={() => {
                            setSelectedCohostBandIds((prev) => [...prev, band._id]);
                            setCohostSearch("");
                          }}
                          className="w-full flex items-center justify-between p-3 hover:bg-muted transition-colors border-b border-border last:border-b-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                              <Music className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <span className="font-medium text-foreground">{band.name}</span>
                          </div>
                          <span className="text-xs text-band flex items-center gap-1">
                            <UserPlus className="w-3 h-3" />
                            Invite
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-2">
                  Event Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, status: "confirmed" }))}
                    className={cn(
                      "px-4 py-3 text-sm font-medium rounded-xl border-2 transition-all",
                      formData.status === "confirmed"
                        ? "bg-success text-white border-success"
                        : "bg-card border-border text-muted-foreground hover:border-success/50"
                    )}
                  >
                    <Check className="w-4 h-4 inline mr-2" />
                    Confirmed
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, status: "hold" }))}
                    className={cn(
                      "px-4 py-3 text-sm font-medium rounded-xl border-2 transition-all",
                      formData.status === "hold"
                        ? "bg-amber-500 text-white border-amber-500"
                        : "bg-card border-border text-muted-foreground hover:border-amber-500/50"
                    )}
                  >
                    <AlertCircle className="w-4 h-4 inline mr-2" />
                    Tentative
                  </button>
                </div>
              </div>

              {/* Address Visibility */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-2">
                  Address Visibility
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, addressVisibility: "public" }))
                    }
                    className={cn(
                      "px-4 py-3 text-sm font-medium rounded-xl border-2 transition-all flex items-center justify-center gap-2",
                      formData.addressVisibility === "public"
                        ? "bg-band text-white border-band"
                        : "bg-card border-border text-muted-foreground hover:border-band/50"
                    )}
                  >
                    <Eye className="w-4 h-4" />
                    Public
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, addressVisibility: "rsvp_only" }))
                    }
                    className={cn(
                      "px-4 py-3 text-sm font-medium rounded-xl border-2 transition-all flex items-center justify-center gap-2",
                      formData.addressVisibility === "rsvp_only"
                        ? "bg-band text-white border-band"
                        : "bg-card border-border text-muted-foreground hover:border-band/50"
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
            </motion.div>
          )}

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-card pt-2 pb-4 border-t border-border flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 bg-muted text-foreground font-medium rounded-xl hover:bg-muted/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-band text-white font-medium rounded-xl hover:bg-band/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Event"
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
