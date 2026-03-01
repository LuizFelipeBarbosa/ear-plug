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
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { cn } from "@/lib/utils";
import {
  PlaceAutocomplete,
  type VenueLocationData,
} from "@/components/maps/PlaceAutocomplete";
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
  const [activeInviteMutationId, setActiveInviteMutationId] = useState<
    string | null
  >(null);
  const actingBandId =
    mode === "band" && bandId ? (bandId as Id<"bands">) : null;
  const allBands = useQuery(api.bands.list, { limit: 100 });
  const cohostRoster = useQuery(
    api.eventCohosts.listEventCohostRoster,
    isOpen && event && actingBandId
      ? { eventId: event._id as Id<"events">, bandId: actingBandId }
      : "skip",
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
        : null,
    );
    setCoverImage(event.image ?? null);
    setImageWasRemoved(false);
    resetForm();
  }, [event, isOpen, resetForm]);
  const rosterInvitedBandIds = useMemo(() => {
    const ids = new Set<string>();
    if (event?.bandId) {
      ids.add(event.bandId);
    }
    if (cohostRoster?.hostBand?._id) {
      ids.add(cohostRoster.hostBand._id);
    }
    (cohostRoster?.acceptedCohostBands ?? []).forEach((cohostBand) => {
      ids.add(cohostBand._id);
    });
    (cohostRoster?.pendingInvites ?? []).forEach((invite) => {
      ids.add(invite.invitedBandId);
    });
    return ids;
  }, [cohostRoster, event?.bandId]);
  const cohostSearchResults = useMemo(() => {
    const normalizedQuery = cohostSearch.trim().toLowerCase();
    if (!normalizedQuery) {
      return [];
    }
    return (allBands ?? [])
      .filter((candidateBand) => candidateBand._id !== bandId)
      .filter((candidateBand) => !rosterInvitedBandIds.has(candidateBand._id))
      .filter((candidateBand) =>
        candidateBand.name.toLowerCase().includes(normalizedQuery),
      )
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
          : "Failed to invite co-host band.",
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
          : "Failed to update co-host invite.",
      );
    } finally {
      setActiveInviteMutationId(null);
    }
  };
  const handleImageSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setSubmitError("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSubmitError("Image must be less than 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      setCoverImage(readerEvent.target?.result as string);
      setImageWasRemoved(false);
      setSubmitError(null);
    };
    reader.readAsDataURL(file);
  };
  const handleFileInputChange = (
    inputEvent: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = inputEvent.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  };
  const removeImage = () => {
    setCoverImage(null);
    setImageWasRemoved(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
    if (formData.capacity.trim().length > 0) {
      const parsedCapacity = Number.parseInt(formData.capacity, 10);
      if (!Number.isFinite(parsedCapacity) || parsedCapacity <= 0) {
        nextErrors.capacity = "Capacity must be a positive number";
      }
    } else if (!isTentative) {
      nextErrors.capacity = "Capacity must be a positive number";
    }
    if (formData.price.trim().length > 0) {
      const parsedPrice = Number.parseFloat(formData.price);
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        nextErrors.price = "Price must be zero or greater";
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };
  const handleSubmit = async (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault();
    if (!event) return;
    if (!actingBandId) {
      setSubmitError("Select a band workspace to manage this event.");
      return;
    }
    setSubmitError(null);
    if (!validateForm(formData.status)) {
      return;
    }
    setIsSubmitting(true);
    try {
      const parsedCapacity =
        formData.capacity.trim().length > 0
          ? Number.parseInt(formData.capacity, 10)
          : undefined;
      const parsedPrice =
        formData.price.trim().length > 0
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
      console.error("Failed to update gig:", error);
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Failed to update gig. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleDelete = async () => {
    if (!event || !wasTentative) return;
    if (!actingBandId) {
      setSubmitError("Select a band workspace to manage this event.");
      return;
    }
    if (!window.confirm("Delete this tentative gig? This cannot be undone.")) {
      return;
    }
    setSubmitError(null);
    setIsDeleting(true);
    try {
      await deleteEvent(event._id, actingBandId);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Failed to delete tentative gig:", error);
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Failed to delete tentative gig. Please try again.",
      );
    } finally {
      setIsDeleting(false);
    }
  };
  if (!isOpen || !event) return null;
  const isTentative = formData.status === "hold";
  const wasTentative = event.status === "hold";
  const isBusy = isSubmitting || isDeleting;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      {" "}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />{" "}
      <div className="relative w-full max-w-lg max-h-[100dvh] sm:max-h-[90vh] h-[100dvh] sm:h-auto bg-card border-2 border-border shadow-2xl overflow-hidden flex flex-col rounded-t-xl sm:rounded-none">
        {" "}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b-2 border-border bg-muted">
          {" "}
          <div>
            {" "}
            <h2 className="text-lg font-bold text-foreground">
              {" "}
              Manage Event{" "}
            </h2>{" "}
            <p className="text-xs text-muted-foreground mt-0.5">
              {" "}
              Update event and venue details{" "}
            </p>{" "}
          </div>{" "}
          <button
            onClick={onClose}
            className="p-2 flex items-center justify-center hover:bg-muted border border-border hover:border-band/30 transition-colors touch-target"
            disabled={isBusy}
          >
            {" "}
            <X className="w-5 h-5 text-muted-foreground" />{" "}
          </button>{" "}
        </div>{" "}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 pb-8"
        >
          {" "}
          {submitError && (
            <div className="p-3 border-2 border-red-500 bg-red-500/10 text-red-300 text-sm flex items-start gap-2">
              {" "}
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{" "}
              <span>{submitError}</span>{" "}
            </div>
          )}{" "}
          <div>
            {" "}
            <label className="block text-xs font-bold text-muted-foreground mb-2">
              {" "}
              Cover Image{" "}
            </label>{" "}
            {coverImage ? (
              <div className="relative aspect-video bg-muted border-2 border-border overflow-hidden group">
                {" "}
                <Image
                  src={coverImage}
                  alt="Cover preview"
                  fill
                  className="object-cover"
                />{" "}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  {" "}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-band text-foreground text-sm font-bold hover:bg-band/90 transition-colors"
                  >
                    {" "}
                    Change{" "}
                  </button>{" "}
                  <button
                    type="button"
                    onClick={removeImage}
                    className="px-4 py-2 bg-red-500 text-foreground text-sm font-bold hover:bg-red-600 transition-colors"
                  >
                    {" "}
                    Remove{" "}
                  </button>{" "}
                </div>{" "}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(dragEvent) => {
                  dragEvent.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(dragEvent) => {
                  dragEvent.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={(dragEvent) => {
                  dragEvent.preventDefault();
                  setIsDragging(false);
                  const file = dragEvent.dataTransfer.files?.[0];
                  if (file) {
                    handleImageSelect(file);
                  }
                }}
                className={cn(
                  "aspect-video border-2 border-dashed rounded-none flex flex-col items-center justify-center cursor-pointer transition-colors",
                  isDragging
                    ? "border-band bg-band/5"
                    : "border-border hover:border-zinc-600 bg-muted",
                )}
              >
                {" "}
                <div className="w-16 h-16 bg-background border-2 border-border flex items-center justify-center mb-3">
                  {" "}
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />{" "}
                </div>{" "}
                <p className="text-sm font-medium text-muted-foreground">
                  {" "}
                  Click or drag image here{" "}
                </p>{" "}
                <p className="text-xs text-muted-foreground mt-1">
                  Max 5MB
                </p>{" "}
              </div>
            )}{" "}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />{" "}
          </div>{" "}
          <div>
            {" "}
            <label className="block text-xs font-bold text-muted-foreground mb-2">
              {" "}
              Event Title{" "}
              {!isTentative && <span className="text-band">*</span>}{" "}
            </label>{" "}
            <input
              type="text"
              value={formData.title}
              onChange={(inputEvent) =>
                updateField("title", inputEvent.target.value)
              }
              className={cn(
                "w-full px-4 py-3.5 bg-muted border-2 rounded-none text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors",
                errors.title
                  ? "border-red-500 focus:border-red-400"
                  : "border-border focus:border-band",
              )}
            />{" "}
            {errors.title && (
              <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                {" "}
                <AlertCircle className="w-3 h-3" /> {errors.title}{" "}
              </p>
            )}{" "}
          </div>{" "}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {" "}
            <div>
              {" "}
              <label className="block text-xs font-bold text-muted-foreground mb-2">
                {" "}
                Date {!isTentative && <span className="text-band">*</span>}{" "}
              </label>{" "}
              <div className="relative">
                {" "}
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  {" "}
                  <Calendar className="w-5 h-5 text-muted-foreground" />{" "}
                </div>{" "}
                <input
                  type="date"
                  value={formData.date}
                  onChange={(inputEvent) =>
                    updateField("date", inputEvent.target.value)
                  }
                  className={cn(
                    "w-full pl-12 pr-4 py-3.5 bg-muted border-2 rounded-none text-foreground focus:outline-none transition-colors appearance-none",
                    errors.date
                      ? "border-red-500 focus:border-red-400"
                      : "border-border focus:border-band",
                  )}
                />{" "}
              </div>{" "}
              {errors.date && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  {" "}
                  <AlertCircle className="w-3 h-3" /> {errors.date}{" "}
                </p>
              )}{" "}
            </div>{" "}
            <div>
              {" "}
              <label className="block text-xs font-bold text-muted-foreground mb-2">
                {" "}
                Start Time{" "}
              </label>{" "}
              <div className="relative">
                {" "}
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  {" "}
                  <Clock className="w-5 h-5 text-muted-foreground" />{" "}
                </div>{" "}
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(inputEvent) =>
                    updateField("startTime", inputEvent.target.value)
                  }
                  placeholder="Optional"
                  className={cn(
                    "w-full pl-12 pr-4 py-3.5 bg-muted border-2 rounded-none text-foreground focus:outline-none transition-colors appearance-none",
                    errors.startTime
                      ? "border-red-500 focus:border-red-400"
                      : "border-border focus:border-band",
                  )}
                />{" "}
              </div>{" "}
              {errors.startTime && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  {" "}
                  <AlertCircle className="w-3 h-3" /> {errors.startTime}{" "}
                </p>
              )}{" "}
            </div>{" "}
          </div>{" "}
          <div>
            {" "}
            <label className="block text-xs font-bold text-muted-foreground mb-2">
              {" "}
              Description{" "}
            </label>{" "}
            <div className="relative">
              {" "}
              <div className="absolute left-4 top-4 pointer-events-none">
                {" "}
                <FileText className="w-5 h-5 text-muted-foreground" />{" "}
              </div>{" "}
              <textarea
                value={formData.description}
                onChange={(inputEvent) =>
                  updateField("description", inputEvent.target.value)
                }
                placeholder="Tell fans about the show..."
                rows={4}
                className="w-full pl-12 pr-4 py-3.5 bg-muted border-2 border-border rounded-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-band transition-colors resize-none"
              />{" "}
            </div>{" "}
          </div>{" "}
          <div>
            {" "}
            <PlaceAutocomplete
              value={venue}
              onChange={(nextVenue) => {
                setVenue(nextVenue);
                if (nextVenue && errors.venue) {
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
            />{" "}
          </div>{" "}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {" "}
            <div>
              {" "}
              <label className="block text-xs font-bold text-muted-foreground mb-2">
                {" "}
                Capacity{" "}
                {!isTentative && <span className="text-band">*</span>}{" "}
              </label>{" "}
              <div className="relative">
                {" "}
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  {" "}
                  <Users className="w-5 h-5 text-muted-foreground" />{" "}
                </div>{" "}
                <input
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={(inputEvent) =>
                    updateField("capacity", inputEvent.target.value)
                  }
                  className={cn(
                    "w-full pl-12 pr-4 py-3.5 bg-muted border-2 rounded-none text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors",
                    errors.capacity
                      ? "border-red-500 focus:border-red-400"
                      : "border-border focus:border-band",
                  )}
                />{" "}
              </div>{" "}
              {errors.capacity && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  {" "}
                  <AlertCircle className="w-3 h-3" /> {errors.capacity}{" "}
                </p>
              )}{" "}
            </div>{" "}
            <div>
              {" "}
              <label className="block text-xs font-bold text-muted-foreground mb-2">
                {" "}
                Ticket Price ($){" "}
              </label>{" "}
              <div className="relative">
                {" "}
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  {" "}
                  <DollarSign className="w-5 h-5 text-muted-foreground" />{" "}
                </div>{" "}
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(inputEvent) =>
                    updateField("price", inputEvent.target.value)
                  }
                  placeholder="0.00"
                  className={cn(
                    "w-full pl-12 pr-4 py-3.5 bg-muted border-2 rounded-none text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors",
                    errors.price
                      ? "border-red-500 focus:border-red-400"
                      : "border-border focus:border-band",
                  )}
                />{" "}
              </div>{" "}
              {errors.price && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  {" "}
                  <AlertCircle className="w-3 h-3" /> {errors.price}{" "}
                </p>
              )}{" "}
            </div>{" "}
          </div>{" "}
          <div>
            {" "}
            <label className="block text-xs font-bold text-muted-foreground mb-2">
              {" "}
              Status{" "}
            </label>{" "}
            <select
              value={formData.status}
              onChange={(inputEvent) =>
                setFormData((prev) => ({
                  ...prev,
                  status: inputEvent.target.value as EventStatus,
                }))
              }
              className="w-full px-4 py-3.5 bg-muted border-2 border-border rounded-none text-foreground focus:outline-none focus:border-band transition-colors"
            >
              {" "}
              <option value="confirmed">Confirmed</option>{" "}
              <option value="hold">Tentative</option>{" "}
            </select>{" "}
          </div>{" "}
          <div>
            {" "}
            <label className="block text-xs font-bold text-muted-foreground mb-2">
              {" "}
              Address Visibility{" "}
            </label>{" "}
            <div className="grid grid-cols-2 gap-2">
              {" "}
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    addressVisibility: "public",
                  }))
                }
                className={cn(
                  "px-3 py-3 text-xs font-bold border-2 transition-all flex items-center justify-center gap-2",
                  formData.addressVisibility === "public"
                    ? "bg-band text-foreground border-band"
                    : "bg-background border-border text-muted-foreground hover:border-zinc-600",
                )}
              >
                {" "}
                <Eye className="w-4 h-4" /> Public{" "}
              </button>{" "}
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    addressVisibility: "rsvp_only",
                  }))
                }
                className={cn(
                  "px-3 py-3 text-xs font-bold border-2 transition-all flex items-center justify-center gap-2",
                  formData.addressVisibility === "rsvp_only"
                    ? "bg-band text-foreground border-band"
                    : "bg-background border-border text-muted-foreground hover:border-zinc-600",
                )}
              >
                {" "}
                <EyeOff className="w-4 h-4" /> RSVP only{" "}
              </button>{" "}
            </div>{" "}
            <p className="text-xs text-muted-foreground mt-2">
              {" "}
              RSVP-only hides the street address from fans until they RSVP.{" "}
            </p>{" "}
          </div>{" "}
          <div>
            {" "}
            <label className="block text-xs font-bold text-muted-foreground mb-2">
              {" "}
              Genres ({formData.genres.length}/{MAX_EVENT_GENRES}){" "}
              {!isTentative && <span className="text-band">*</span>}{" "}
            </label>{" "}
            <div
              className={cn(
                "grid grid-cols-2 gap-2 p-3 bg-muted border-2 rounded-none",
                errors.genres ? "border-red-500" : "border-border",
              )}
            >
              {" "}
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
                        ? formData.genres.filter(
                            (genre) => genre !== genreOption.value,
                          )
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
                      "px-3 py-2 text-sm font-medium border-2 transition-all",
                      isSelected
                        ? "text-foreground"
                        : isDisabled
                          ? "bg-background border-border text-muted-foreground cursor-not-allowed"
                          : "hover:brightness-110",
                    )}
                    style={
                      isSelected
                        ? {
                            backgroundColor: genreColor,
                            borderColor: genreColor,
                          }
                        : isDisabled
                          ? undefined
                          : {
                              borderColor: `${genreColor}70`,
                              color: genreColor,
                              backgroundColor: `${genreColor}14`,
                            }
                    }
                  >
                    {" "}
                    {genreOption.label}{" "}
                  </button>
                );
              })}{" "}
            </div>{" "}
            <p className="text-xs text-muted-foreground mt-2">
              {" "}
              Select up to {MAX_EVENT_GENRES} genres.{" "}
            </p>{" "}
            {errors.genres && (
              <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                {" "}
                <AlertCircle className="w-3 h-3" /> {errors.genres}{" "}
              </p>
            )}{" "}
          </div>{" "}
          <div>
            {" "}
            <label className="block text-xs font-bold text-muted-foreground mb-2">
              {" "}
              Co-host Bands{" "}
            </label>{" "}
            <div className="space-y-3 p-3 bg-muted border-2 border-border">
              {" "}
              <div>
                {" "}
                <p className="text-[10px] text-muted-foreground mb-2">
                  {" "}
                  Current lineup{" "}
                </p>{" "}
                <div className="space-y-1">
                  {" "}
                  {cohostRoster?.hostBand && (
                    <div className="flex items-center justify-between gap-3 border border-band/40 bg-band/10 px-3 py-2">
                      {" "}
                      <span className="text-sm text-foreground truncate">
                        {" "}
                        {cohostRoster.hostBand.name}{" "}
                      </span>{" "}
                      <span className="text-[10px] text-band font-bold">
                        {" "}
                        Host{" "}
                      </span>{" "}
                    </div>
                  )}{" "}
                  {(cohostRoster?.acceptedInvites?.length ?? 0) > 0 &&
                    cohostRoster?.acceptedInvites.map((invite) => (
                      <div
                        key={invite._id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-border bg-background px-3 py-2"
                      >
                        {" "}
                        <span className="text-sm text-foreground truncate">
                          {" "}
                          {invite.invitedBand?.name ?? "Band"}{" "}
                        </span>{" "}
                        <button
                          type="button"
                          onClick={() => handleRevokeCohostInvite(invite._id)}
                          disabled={
                            activeInviteMutationId === `revoke-${invite._id}`
                          }
                          className="w-full sm:w-auto text-[10px] text-red-300 border border-red-500/40 px-2 py-1 hover:bg-red-500/10"
                        >
                          {" "}
                          Revoke{" "}
                        </button>{" "}
                      </div>
                    ))}{" "}
                </div>{" "}
              </div>{" "}
              {(cohostRoster?.pendingInvites?.length ?? 0) > 0 && (
                <div>
                  {" "}
                  <p className="text-[10px] text-muted-foreground mb-2">
                    {" "}
                    Pending invites{" "}
                  </p>{" "}
                  <div className="space-y-1">
                    {" "}
                    {cohostRoster?.pendingInvites.map((invite) => (
                      <div
                        key={invite._id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-border bg-background px-3 py-2"
                      >
                        {" "}
                        <div className="min-w-0">
                          {" "}
                          <p className="text-sm text-foreground truncate">
                            {" "}
                            {invite.invitedBand?.name ?? "Band"}{" "}
                          </p>{" "}
                          <p className="text-[10px] text-muted-foreground">
                            {" "}
                            Pending{" "}
                          </p>{" "}
                        </div>{" "}
                        <button
                          type="button"
                          onClick={() => handleRevokeCohostInvite(invite._id)}
                          disabled={
                            activeInviteMutationId === `revoke-${invite._id}`
                          }
                          className={cn(
                            "w-full sm:w-auto text-[10px] border px-2 py-1",
                            activeInviteMutationId === `revoke-${invite._id}`
                              ? "text-muted-foreground border-border cursor-not-allowed"
                              : "text-red-300 border-red-500/40 hover:bg-red-500/10",
                          )}
                        >
                          {" "}
                          Revoke{" "}
                        </button>{" "}
                      </div>
                    ))}{" "}
                  </div>{" "}
                </div>
              )}{" "}
              <div className="pt-1 border-t border-border">
                {" "}
                <p className="text-[10px] text-muted-foreground mb-2">
                  {" "}
                  Invite another band{" "}
                </p>{" "}
                <input
                  type="text"
                  value={cohostSearch}
                  onChange={(inputEvent) =>
                    setCohostSearch(inputEvent.target.value)
                  }
                  placeholder="Search bands to invite as co-hosts..."
                  className="w-full px-3 py-2 bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-band"
                />{" "}
                {cohostSearchResults.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {" "}
                    {cohostSearchResults.map((candidateBand) => (
                      <button
                        key={candidateBand._id}
                        type="button"
                        onClick={() =>
                          handleInviteCohostBand(candidateBand._id)
                        }
                        disabled={
                          activeInviteMutationId ===
                          `invite-${candidateBand._id}`
                        }
                        className={cn(
                          "w-full flex items-center justify-between gap-3 px-3 py-2 text-left border border-border bg-background transition-colors",
                          activeInviteMutationId ===
                            `invite-${candidateBand._id}`
                            ? "opacity-60 cursor-not-allowed"
                            : "hover:border-band/40",
                        )}
                      >
                        {" "}
                        <span className="text-sm text-foreground truncate">
                          {candidateBand.name}
                        </span>{" "}
                        <span className="text-[10px] text-band font-bold">
                          {" "}
                          Invite{" "}
                        </span>{" "}
                      </button>
                    ))}{" "}
                  </div>
                )}{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
          <div className="pt-2 pb-4">
            {" "}
            {wasTentative && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isBusy}
                className={cn(
                  "w-full py-3 mb-3 font-bold text-sm border-2 transition-all touch-target flex items-center justify-center gap-2",
                  isBusy
                    ? "bg-muted text-muted-foreground border-border cursor-not-allowed"
                    : "bg-red-500/10 text-red-400 border-red-500/50 hover:bg-red-500 hover:text-foreground hover:border-red-500",
                )}
              >
                {" "}
                {isDeleting ? (
                  <>
                    {" "}
                    <Loader2 className="w-5 h-5 animate-spin" />{" "}
                    Deleting...{" "}
                  </>
                ) : (
                  <>
                    {" "}
                    <Trash2 className="w-5 h-5" /> Delete Tentative Gig{" "}
                  </>
                )}{" "}
              </button>
            )}{" "}
            <button
              type="submit"
              disabled={isBusy}
              className={cn(
                "w-full py-4 font-bold text-sm border-2 transition-all touch-target flex items-center justify-center gap-2",
                isBusy
                  ? "bg-muted text-muted-foreground border-border cursor-not-allowed"
                  : "bg-band text-foreground border-band hover:bg-transparent hover:text-band",
              )}
            >
              {" "}
              {isSubmitting ? (
                <>
                  {" "}
                  <Loader2 className="w-5 h-5 animate-spin" />{" "}
                  {isTentative
                    ? "Saving..."
                    : wasTentative
                      ? "Publishing..."
                      : "Saving..."}{" "}
                </>
              ) : (
                <>
                  {" "}
                  <Check className="w-5 h-5" />{" "}
                  {isTentative
                    ? "Save Tentative Gig"
                    : wasTentative
                      ? "Publish Confirmed Gig"
                      : "Save Confirmed Gig"}{" "}
                </>
              )}{" "}
            </button>{" "}
          </div>{" "}
        </form>{" "}
      </div>{" "}
    </div>
  );
}
