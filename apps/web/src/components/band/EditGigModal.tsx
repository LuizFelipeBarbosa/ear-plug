"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  AlertCircle,
  Loader2,
  Trash2,
  Music,
  UserPlus,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { type VenueLocationData } from "@/components/ui/CityAutocomplete";
import { useSharedEvents } from "@/hooks/useSharedEvents";
import { useProfileContext } from "@/hooks/useProfileContext";
import { GigModalShell } from "@/components/band/GigModalShell";
import {
  createGigFormData,
  GigDetailsSection,
  type GigFormData,
  type GigModalTab,
  GigModalTabs,
  GigSettingsSection,
  parseGigFormNumbers,
  validateGigForm,
} from "@/components/band/GigFormShared";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import type {
  EventAddressVisibility,
  EventStatus,
  Genre,
} from "@ear-plug/shared/types";

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
  const [activeTab, setActiveTab] = useState<GigModalTab>("details");

  const [formData, setFormData] = useState<GigFormData>(() =>
    createGigFormData("confirmed"),
  );

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

  const clearFieldError = (field: string) => {
    if (!errors[field]) {
      return;
    }
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const updateField = (field: keyof GigFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field);
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

  const removeImage = () => {
    setCoverImage(null);
    setImageWasRemoved(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateForm = (targetStatus: EventStatus): boolean => {
    const nextErrors = validateGigForm(formData, venue, targetStatus);
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
      const { capacity: parsedCapacity, price: parsedPrice } =
        parseGigFormNumbers(formData);
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
  const wasTentative = event.status === "hold";
  const isBusy = isSubmitting || isDeleting;

  return (
    <GigModalShell
      isOpen={isOpen}
      onClose={onClose}
      closeDisabled={isBusy}
      labelledBy="edit-gig-modal-title"
    >
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-border bg-card/95 px-4 pt-4 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2
                id="edit-gig-modal-title"
                className="text-base font-bold text-foreground sm:text-lg"
              >
                Manage Event
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Update event details and settings
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="shrink-0 rounded-xl border border-border bg-muted p-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <GigModalTabs activeTab={activeTab} onChange={setActiveTab} />
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-24 pt-4 sm:pb-8">
          <div className="space-y-4">
            {submitError && (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">
                <AlertCircle className="mt-0.5 w-4 h-4 flex-shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {activeTab === "details" && (
              <GigDetailsSection
                formData={formData}
                errors={errors}
                venue={venue}
                coverImage={coverImage}
                isDragging={isDragging}
                setIsDragging={setIsDragging}
                fileInputRef={fileInputRef}
                onImageSelect={handleImageSelect}
                onRemoveImage={removeImage}
                onUpdateField={updateField}
                onVenueChange={setVenue}
                onGenresChange={(genres) =>
                  setFormData((prev) => ({ ...prev, genres }))
                }
                clearError={clearFieldError}
              />
            )}

            {activeTab === "lineup" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                    Current Lineup
                  </h3>
                  <div className="space-y-2">
                    {cohostRoster?.hostBand && (
                      <div className="rounded-xl border border-band/30 bg-band/10 p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-band/20">
                            <Music className="w-5 h-5 text-band" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {cohostRoster.hostBand.name}
                            </p>
                            <p className="text-xs text-band">Host Band</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {(cohostRoster?.acceptedInvites?.length ?? 0) > 0 &&
                      cohostRoster?.acceptedInvites.map((invite) => (
                        <div
                          key={invite._id}
                          className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                              <Music className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">
                                {invite.invitedBand?.name ?? "Band"}
                              </p>
                              <p className="text-xs text-success">Co-host</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRevokeCohostInvite(invite._id)}
                            disabled={activeInviteMutationId === `revoke-${invite._id}`}
                            className="w-full rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500 transition-colors hover:bg-red-500/20 disabled:opacity-50 sm:w-auto"
                          >
                            Revoke
                          </button>
                        </div>
                      ))}
                  </div>
                </div>

                {(cohostRoster?.pendingInvites?.length ?? 0) > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                      Pending Invites
                    </h3>
                    <div className="space-y-2">
                      {cohostRoster?.pendingInvites.map((invite) => (
                        <div
                          key={invite._id}
                          className="flex flex-col gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                              <Music className="w-5 h-5 text-amber-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">
                                {invite.invitedBand?.name ?? "Band"}
                              </p>
                              <p className="text-xs text-amber-500">Pending</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRevokeCohostInvite(invite._id)}
                            disabled={activeInviteMutationId === `revoke-${invite._id}`}
                            className="w-full rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500 transition-colors hover:bg-red-500/20 disabled:opacity-50 sm:w-auto"
                          >
                            Cancel
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                    Invite Co-host
                  </h3>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={cohostSearch}
                      onChange={(e) => setCohostSearch(e.target.value)}
                      placeholder="Search bands..."
                      className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-band focus:outline-none"
                    />
                    {cohostSearchResults.length > 0 && (
                      <div className="overflow-hidden rounded-xl border border-border">
                        {cohostSearchResults.map((band) => (
                          <button
                            key={band._id}
                            type="button"
                            onClick={() => handleInviteCohostBand(band._id)}
                            disabled={activeInviteMutationId === `invite-${band._id}`}
                            className="flex w-full flex-wrap items-center justify-between gap-3 border-b border-border p-3 text-left transition-colors hover:bg-muted last:border-b-0"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                                <Music className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <span className="truncate font-medium text-foreground">
                                {band.name}
                              </span>
                            </div>
                            <span className="flex shrink-0 items-center gap-1 text-xs text-band">
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

            {activeTab === "settings" && (
              <GigSettingsSection
                formData={formData}
                onStatusChange={(status) =>
                  setFormData((prev) => ({ ...prev, status }))
                }
                onAddressVisibilityChange={(addressVisibility) =>
                  setFormData((prev) => ({ ...prev, addressVisibility }))
                }
                dangerSlot={
                  wasTentative ? (
                    <div className="border-t border-border pt-4">
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-500 transition-colors hover:bg-red-500/20"
                      >
                        <Trash2 className="w-4 h-4" />
                        {isDeleting ? "Deleting..." : "Delete Event"}
                      </button>
                    </div>
                  ) : undefined
                }
              />
            )}
          </div>
        </div>

        <div className="safe-area-inset-bottom border-t border-border bg-card/95 px-4 pb-4 pt-3 backdrop-blur-xl">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="w-full rounded-xl bg-muted py-3 font-medium text-foreground transition-colors hover:bg-muted/80"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isBusy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-band py-3 font-medium text-white transition-colors hover:bg-band/90 disabled:opacity-50"
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
        </div>
      </form>
    </GigModalShell>
  );
}
