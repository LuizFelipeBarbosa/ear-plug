"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Check,
  AlertCircle,
  Loader2,
  Trash2,
  Music,
  UserPlus,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { type VenueLocationData } from "@/components/ui/CityAutocomplete";
import { useSharedEvents } from "@/hooks/useSharedEvents";
import { useProfileContext } from "@/hooks/useProfileContext";
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
  const isTentative = formData.status === "hold";
  const wasTentative = event.status === "hold";
  const isBusy = isSubmitting || isDeleting;

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

          <GigModalTabs activeTab={activeTab} onChange={setActiveTab} />
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {submitError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
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
                ) : undefined
              }
            />
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
