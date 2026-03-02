"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
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
  Trash2,
  ChevronRight,
  MapPin,
  Music,
  UserPlus,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  CityAutocomplete,
  type VenueLocationData,
} from "@/components/ui/CityAutocomplete";
import { useSharedEvents } from "@/hooks/useSharedEvents";
import { useProfileContext } from "@/hooks/useProfileContext";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { GENRES, GENRE_COLORS } from "@ear-plug/shared/constants";
import type {
  EventAddressVisibility,
  EventStatus,
  Genre,
} from "@ear-plug/shared/types";

const MAX_EVENT_GENRES = 3;

interface EditableEvent {
  _id: string;
  bandId?: string;
  title?: string;
  dateTime?: number;
  image?: string;
  genres?: Genre[];
  genre?: Genre;
  capacity?: number;
  price?: number;
  description?: string;
  status?: EventStatus;
  addressVisibility?: EventAddressVisibility;
  venue?: {
    name: string;
    address: string;
    city: string;
    coordinates: { lat: number; lng: number };
    capacity?: number;
  } | null;
}

interface EditGigModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EditableEvent | null;
  onSuccess?: () => void;
}

export function EditGigModal({
  isOpen,
  onClose,
  event,
  onSuccess,
}: EditGigModalProps) {
  const { updateEvent, deleteEvent } = useSharedEvents();
  const { mode, bandId } = useProfileContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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
    status: "confirmed" as EventStatus,
    addressVisibility: "public" as EventAddressVisibility,
  });

  const [venue, setVenue] = useState<VenueLocationData | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [imageWasRemoved, setImageWasRemoved] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cohostSearch, setCohostSearch] = useState("");
  const [activeInviteMutationId, setActiveInviteMutationId] = useState<string | null>(null);

  const actingBandId = mode === "band" && bandId ? (bandId as Id<"bands">) : null;
  const allBands = useQuery(api.bands.list, { limit: 100 });
  const cohostRoster = useQuery(
    api.eventCohosts.listEventCohostRoster,
    isOpen && event && actingBandId
      ? { eventId: event._id as Id<"events">, bandId: actingBandId }
      : "skip"
  );

  const inviteBandsToEvent = useMutation(api.eventCohosts.inviteBandsToEvent);
  const revokeEventInvite = useMutation(api.eventCohosts.revokeEventInvite);

  const formatDateInput = (timestamp: number): string => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatTimeInput = (timestamp: number): string => {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const resetForm = useCallback(() => {
    setSubmitError(null);
    setErrors({});
  }, []);

  useEffect(() => {
    if (!isOpen || !event) return;
    const eventGenres =
      event.genres && event.genres.length > 0
        ? event.genres
        : event.genre
        ? [event.genre]
        : [];
    setFormData({
      title: event.title ?? "",
      date: event.dateTime ? formatDateInput(event.dateTime) : "",
      startTime: event.dateTime ? formatTimeInput(event.dateTime) : "",
      genres: eventGenres,
      capacity: event.capacity !== undefined ? String(event.capacity) : "",
      price: event.price !== undefined ? (event.price / 100).toFixed(2) : "",
      description: event.description ?? "",
      status: event.status === "hold" ? "hold" : "confirmed",
      addressVisibility: event.addressVisibility ?? "public",
    });
    setVenue(
      event.venue
        ? {
            name: event.venue.name,
            address: event.venue.address,
            city: event.venue.city,
            coordinates: event.venue.coordinates,
            capacity: event.venue.capacity,
          }
        : null
    );
    setCoverImage(event.image ?? null);
    setImageWasRemoved(false);
    resetForm();
  }, [event, isOpen, resetForm]);

  const rosterInvitedBandIds = useMemo(() => {
    const ids = new Set<string>();
    if (event?.bandId) ids.add(event.bandId);
    if (cohostRoster?.hostBand?._id) ids.add(cohostRoster.hostBand._id);
    (cohostRoster?.acceptedCohostBands ?? []).forEach((b) => ids.add(b._id));
    (cohostRoster?.pendingInvites ?? []).forEach((i) => ids.add(i.invitedBandId));
    return ids;
  }, [cohostRoster, event?.bandId]);

  const cohostSearchResults = useMemo(() => {
    const normalizedQuery = cohostSearch.trim().toLowerCase();
    if (!normalizedQuery) return [];
    return (allBands ?? [])
      .filter((b) => b._id !== bandId)
      .filter((b) => !rosterInvitedBandIds.has(b._id))
      .filter((b) => b.name.toLowerCase().includes(normalizedQuery))
      .slice(0, 8);
  }, [allBands, bandId, cohostSearch, rosterInvitedBandIds]);

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

  const handleInviteCohostBand = async (invitedBandId: string) => {
    if (!event || !actingBandId) {
      setSubmitError("Select a band workspace to manage co-host invites.");
      return;
    }
    setSubmitError(null);
    setActiveInviteMutationId(`invite-${invitedBandId}`);
    try {
      await inviteBandsToEvent({
        eventId: event._id as Id<"events">,
        actingBandId,
        invitedBandIds: [invitedBandId as Id<"bands">],
      });
      setCohostSearch("");
    } catch (inviteError) {
      setSubmitError(
        inviteError instanceof Error
          ? inviteError.message
          : "Failed to invite co-host band"
      );
    } finally {
      setActiveInviteMutationId(null);
    }
  };

  const handleRevokeCohostInvite = async (inviteId: string) => {
    if (!event || !actingBandId) {
      setSubmitError("Select a band workspace to manage co-host invites.");
      return;
    }
    setSubmitError(null);
    setActiveInviteMutationId(`revoke-${inviteId}`);
    try {
      await revokeEventInvite({
        inviteId: inviteId as Id<"eventCohostInvites">,
        actingBandId,
      });
    } catch (revokeError) {
      setSubmitError(
        revokeError instanceof Error
          ? revokeError.message
          : "Failed to update co-host invite"
      );
    } finally {
      setActiveInviteMutationId(null);
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
      setImageWasRemoved(false);
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
    setImageWasRemoved(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateForm = (targetStatus: EventStatus): boolean => {
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
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    if (!actingBandId) {
      setSubmitError("Select a band workspace to manage this event");
      return;
    }
    setSubmitError(null);
    if (!validateForm(formData.status)) return;

    setIsSubmitting(true);
    try {
      const parsedCapacity = formData.capacity.trim()
        ? Number.parseInt(formData.capacity, 10)
        : undefined;
      const parsedPrice = formData.price.trim()
        ? Math.round(Number.parseFloat(formData.price) * 100)
        : undefined;
      await updateEvent({
        eventId: event._id,
        actingBandId,
        title: formData.title.trim(),
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
        image: imageWasRemoved ? "" : coverImage || undefined,
        genres: formData.genres,
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
        error instanceof Error ? error.message : "Failed to update event"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!event || !wasTentative) return;
    if (!actingBandId) {
      setSubmitError("Select a band workspace to manage this event");
      return;
    }
    if (!window.confirm("Delete this tentative event? This cannot be undone.")) {
      return;
    }
    setSubmitError(null);
    setIsDeleting(true);
    try {
      await deleteEvent(event._id, actingBandId);
      onSuccess?.();
      onClose();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to delete event"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen || !event) return null;
  const isTentative = formData.status === "hold";
  const wasTentative = event.status === "hold";
  const isBusy = isSubmitting || isDeleting;

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
            <div>
              <h2 className="text-lg font-bold text-foreground">Manage Event</h2>
              <p className="text-xs text-muted-foreground">
                Update event details and settings
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isBusy}
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
                  Event Title {!isTentative && <span className="text-band">*</span>}
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
                    Date {!isTentative && <span className="text-band">*</span>}
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
                required={!isTentative}
                error={errors.venue}
              />

              {/* Capacity & Price */}
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
                  {!isTentative && <span className="text-band">*</span>}
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
                  {cohostRoster?.hostBand && (
                    <div className="flex items-center justify-between p-3 bg-band/10 border border-band/30 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-band/20 rounded-lg flex items-center justify-center">
                          <Music className="w-5 h-5 text-band" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{cohostRoster.hostBand.name}</p>
                          <p className="text-xs text-band">Host Band</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {(cohostRoster?.acceptedInvites?.length ?? 0) > 0 &&
                    cohostRoster?.acceptedInvites.map((invite) => (
                      <div
                        key={invite._id}
                        className="flex items-center justify-between p-3 bg-card border border-border rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                            <Music className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{invite.invitedBand?.name ?? "Band"}</p>
                            <p className="text-xs text-success">Co-host</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRevokeCohostInvite(invite._id)}
                          disabled={activeInviteMutationId === `revoke-${invite._id}`}
                          className="px-3 py-1.5 text-xs text-red-500 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
                        >
                          Revoke
                        </button>
                      </div>
                    ))}
                </div>
              </div>

              {/* Pending Invites */}
              {(cohostRoster?.pendingInvites?.length ?? 0) > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Pending Invites</h3>
                  <div className="space-y-2">
                    {cohostRoster?.pendingInvites.map((invite) => (
                      <div
                        key={invite._id}
                        className="flex items-center justify-between p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                            <Music className="w-5 h-5 text-amber-500" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{invite.invitedBand?.name ?? "Band"}</p>
                            <p className="text-xs text-amber-500">Pending</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRevokeCohostInvite(invite._id)}
                          disabled={activeInviteMutationId === `revoke-${invite._id}`}
                          className="px-3 py-1.5 text-xs text-red-500 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                  {cohostSearchResults.length > 0 && (
                    <div className="border border-border rounded-xl overflow-hidden">
                      {cohostSearchResults.map((band) => (
                        <button
                          key={band._id}
                          type="button"
                          onClick={() => handleInviteCohostBand(band._id)}
                          disabled={activeInviteMutationId === `invite-${band._id}`}
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

              {/* Delete */}
              {wasTentative && (
                <div className="pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 text-red-500 border border-red-500/30 rounded-xl hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    {isDeleting ? "Deleting..." : "Delete Event"}
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-card pt-2 pb-4 border-t border-border flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="flex-1 py-3 bg-muted text-foreground font-medium rounded-xl hover:bg-muted/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isBusy}
              className="flex-1 py-3 bg-band text-white font-medium rounded-xl hover:bg-band/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
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
  );
}
