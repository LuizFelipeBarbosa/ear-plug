"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
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
  createEmptyGigPollOption,
  buildEventPollFromForm,
  GigBandSearchInput,
  GigDetailsSection,
  type GigFormData,
  GigLineupItem,
  GigModalErrorAlert,
  GigModalFooter,
  GigModalHeader,
  type GigModalTab,
  GigModalTabs,
  GigSectionCard,
  GigSettingsSection,
  parseGigFormNumbers,
  validateGigForm,
} from "@/components/band/GigFormShared";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import type {
  EventAddressVisibility,
  EventPoll,
  EventStatus,
  Genre,
} from "@ear-plug/shared/types";
import {
  IMAGE_UPLOAD_MIME_TYPES,
  MAX_IMAGE_UPLOAD_BYTES,
} from "@ear-plug/shared/constants";
import { getConvexErrorMessage } from "@/lib/convexErrors";

const IMAGE_MIME_TYPES = new Set<string>(IMAGE_UPLOAD_MIME_TYPES);

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
  poll?: EventPoll;
  pollHasResponses?: boolean;
  pollResponseCount?: number;
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
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
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
      pollEnabled: !!event.poll,
      pollQuestion: event.poll?.question ?? "",
      pollOptions:
        event.poll?.options && event.poll.options.length >= 2
          ? event.poll.options.map((option) => ({
              id: option.id,
              label: option.label,
            }))
          : [createEmptyGigPollOption(), createEmptyGigPollOption()],
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
    setCoverImageFile(null);
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
        getConvexErrorMessage(inviteError, "Failed to invite co-host band."),
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
        getConvexErrorMessage(revokeError, "Failed to update co-host invite."),
      );
    } finally {
      setActiveInviteMutationId(null);
    }
  };

  const handleImageSelect = (file: File) => {
    if (!IMAGE_MIME_TYPES.has(file.type)) {
      setSubmitError("Image format must be JPEG, PNG, or WEBP.");
      return;
    }
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      setSubmitError("Image size must be 10 MB or less.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setCoverImage(e.target?.result as string);
      setCoverImageFile(file);
      setImageWasRemoved(false);
      setSubmitError(null);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setCoverImage(null);
    setCoverImageFile(null);
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
        imageFile: coverImageFile || undefined,
        removeImage: imageWasRemoved,
        genres: formData.genres,
        capacity: parsedCapacity,
        description: formData.description.trim(),
        price: parsedPrice,
        status: formData.status,
        addressVisibility: formData.addressVisibility,
        poll: formData.pollEnabled ? buildEventPollFromForm(formData) : null,
      });
      onSuccess?.();
      onClose();
    } catch (error) {
      setSubmitError(getConvexErrorMessage(error, "Failed to update event."));
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
      setSubmitError(getConvexErrorMessage(error, "Failed to delete event."));
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
        <GigModalHeader
          labelledBy="edit-gig-modal-title"
          title={event.title?.trim() || "Manage Event"}
          description="Update details, lineup, and settings."
          icon={formData.status === "hold" ? AlertCircle : Check}
          onClose={onClose}
          closeDisabled={isBusy}
          tone={formData.status === "hold" ? "tentative" : "confirmed"}
          badgeLabel={formData.status === "hold" ? "Tentative" : "Confirmed"}
          eyebrow="Gig Editor"
        />
        <div className="border-b border-border bg-card/95 px-4 pb-4 backdrop-blur-xl">
          <GigModalTabs activeTab={activeTab} onChange={setActiveTab} />
        </div>

        <div className="flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-24 pt-4 sm:pb-8">
          <div className="space-y-4">
            {submitError ? <GigModalErrorAlert message={submitError} /> : null}

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
                <GigSectionCard
                  title="Current Lineup"
                  description="Manage the host band, accepted co-hosts, and any outstanding invitations."
                >
                  {cohostRoster?.hostBand ? (
                    <GigLineupItem
                      name={cohostRoster.hostBand.name}
                      subtitle="Host Band"
                      tone="host"
                    />
                  ) : null}

                  {cohostRoster?.acceptedInvites.map((invite) => (
                    <GigLineupItem
                      key={invite._id}
                      name={invite.invitedBand?.name ?? "Band"}
                      subtitle="Co-host"
                      tone="accepted"
                      actionLabel="Revoke"
                      onAction={() => handleRevokeCohostInvite(invite._id)}
                      actionDisabled={activeInviteMutationId === `revoke-${invite._id}`}
                    />
                  ))}

                  {(cohostRoster?.pendingInvites ?? []).map((invite) => (
                    <GigLineupItem
                      key={invite._id}
                      name={invite.invitedBand?.name ?? "Band"}
                      subtitle="Pending"
                      tone="pending"
                      actionLabel="Cancel"
                      onAction={() => handleRevokeCohostInvite(invite._id)}
                      actionDisabled={activeInviteMutationId === `revoke-${invite._id}`}
                    />
                  ))}

                  {(cohostRoster?.acceptedInvites?.length ?? 0) === 0 &&
                  (cohostRoster?.pendingInvites?.length ?? 0) === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                      No co-host bands have been added yet.
                    </div>
                  ) : null}
                </GigSectionCard>

                <GigSectionCard
                  title="Invite Co-host"
                  description="Search for bands and send new co-host invitations from the event roster."
                >
                  <GigBandSearchInput
                    value={cohostSearch}
                    onChange={setCohostSearch}
                    placeholder="Search bands to invite..."
                  />
                  {cohostSearchResults.length > 0 ? (
                    <div className="overflow-hidden rounded-xl border border-border">
                      {cohostSearchResults.map((band) => (
                        <button
                          key={band._id}
                          type="button"
                          onClick={() => handleInviteCohostBand(band._id)}
                          disabled={activeInviteMutationId === `invite-${band._id}`}
                          className="flex w-full flex-wrap items-center justify-between gap-3 border-b border-border p-3 text-left transition-colors hover:bg-muted last:border-b-0 disabled:opacity-50"
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
                  ) : cohostSearch.trim() ? (
                    <div className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                      No matching bands found.
                    </div>
                  ) : null}
                </GigSectionCard>
              </motion.div>
            )}

            {activeTab === "settings" && (
              <GigSettingsSection
                formData={formData}
                errors={errors}
                onStatusChange={(status) =>
                  setFormData((prev) => ({ ...prev, status }))
                }
                onAddressVisibilityChange={(addressVisibility) =>
                  setFormData((prev) => ({ ...prev, addressVisibility }))
                }
                onPollEnabledChange={(pollEnabled) =>
                  setFormData((prev) => ({
                    ...prev,
                    pollEnabled,
                    pollQuestion: pollEnabled ? prev.pollQuestion : "",
                    pollOptions: pollEnabled
                      ? prev.pollOptions.length >= 2
                        ? prev.pollOptions
                        : [createEmptyGigPollOption(), createEmptyGigPollOption()]
                      : [createEmptyGigPollOption(), createEmptyGigPollOption()],
                  }))
                }
                onPollQuestionChange={(pollQuestion) =>
                  setFormData((prev) => ({ ...prev, pollQuestion }))
                }
                onPollOptionChange={(optionId, value) =>
                  setFormData((prev) => ({
                    ...prev,
                    pollOptions: prev.pollOptions.map((option) =>
                      option.id === optionId ? { ...option, label: value } : option,
                    ),
                  }))
                }
                onAddPollOption={() =>
                  setFormData((prev) => ({
                    ...prev,
                    pollOptions: [...prev.pollOptions, createEmptyGigPollOption()],
                  }))
                }
                onRemovePollOption={(optionId) =>
                  setFormData((prev) => ({
                    ...prev,
                    pollOptions: prev.pollOptions.filter(
                      (option) => option.id !== optionId,
                    ),
                  }))
                }
                clearError={clearFieldError}
                pollLocked={event.pollHasResponses}
                pollResponseCount={event.pollResponseCount ?? 0}
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

        <GigModalFooter
          onCancel={onClose}
          cancelDisabled={isBusy}
          primaryLabel="Save Changes"
          primaryBusyLabel="Saving..."
          primaryDisabled={isBusy}
          isBusy={isSubmitting}
        />
      </form>
    </GigModalShell>
  );
}
