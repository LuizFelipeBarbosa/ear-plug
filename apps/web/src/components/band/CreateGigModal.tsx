"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Music,
  UserPlus,
  Clock3,
} from "lucide-react";
import { useQuery } from "convex/react";
import { type VenueLocationData } from "@/components/ui/CityAutocomplete";
import { useSharedEvents } from "@/hooks/useSharedEvents";
import {
  buildEventPollFromForm,
  createGigFormData,
  createEmptyGigPollOption,
  GigBandSearchInput,
  GigDetailsSection,
  GigLineupItem,
  GigModalErrorAlert,
  GigModalFooter,
  GigModalHeader,
  type GigFormData,
  type GigModalTab,
  GigModalTabs,
  GigSectionCard,
  GigSettingsSection,
  parseGigFormNumbers,
  validateGigForm,
} from "@/components/band/GigFormShared";
import { GigModalShell } from "@/components/band/GigModalShell";
import { getConvexErrorMessage } from "@/lib/convexErrors";
import { api } from "../../../../../convex/_generated/api";
import {
  IMAGE_UPLOAD_MIME_TYPES,
  MAX_IMAGE_UPLOAD_BYTES,
} from "@ear-plug/shared/constants";
import type { EventStatus } from "@ear-plug/shared/types";

const IMAGE_MIME_TYPES = new Set<string>(IMAGE_UPLOAD_MIME_TYPES);

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
  const initialStatus = (isTentative ? "hold" : "confirmed") as EventStatus;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<GigModalTab>("details");

  const [formData, setFormData] = useState<GigFormData>(() =>
    createGigFormData(initialStatus),
  );

  const [venue, setVenue] = useState<VenueLocationData | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
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

  const resetForm = useCallback(() => {
    setFormData(createGigFormData(initialStatus));
    setVenue(null);
    setCoverImage(null);
    setCoverImageFile(null);
    setIsDragging(false);
    setErrors({});
    setSubmitError(null);
    setCohostSearch("");
    setSelectedCohostBandIds([]);
    setActiveTab("details");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [initialStatus]);

  // Reset form whenever the modal is opened.
  useEffect(() => {
    if (!isOpen) return;
    resetForm();
  }, [isOpen, resetForm]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

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
      setSubmitError(null);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setCoverImage(null);
    setCoverImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateForm = (): boolean => {
    const nextErrors = validateGigForm(formData, venue);
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const { capacity: parsedCapacity, price: parsedPrice } =
        parseGigFormNumbers(formData);

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
        imageFile: coverImageFile || undefined,
        genres: formData.genres.length > 0 ? formData.genres : undefined,
        capacity: parsedCapacity,
        description: formData.description.trim(),
        price: parsedPrice,
        status: formData.status,
        addressVisibility: formData.addressVisibility,
        poll: buildEventPollFromForm(formData),
      });

      onSuccess?.();
      handleClose();
    } catch (error) {
      setSubmitError(getConvexErrorMessage(error, "Failed to create gig."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GigModalShell
      isOpen={isOpen}
      onClose={handleClose}
      closeDisabled={isSubmitting}
      labelledBy="create-gig-modal-title"
    >
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <GigModalHeader
          labelledBy="create-gig-modal-title"
          title={isTentative ? "Create Tentative Gig" : "Create Confirmed Gig"}
          description={`Add a new show for ${bandName}`}
          icon={isTentative ? Clock3 : Check}
          onClose={handleClose}
          closeDisabled={isSubmitting}
          tone={isTentative ? "tentative" : "confirmed"}
          badgeLabel={isTentative ? "Draft" : "Published"}
          eyebrow="New Gig"
        />
        <div className="border-b border-border bg-card/95 px-4 pb-4 backdrop-blur-xl">
          <GigModalTabs activeTab={activeTab} onChange={setActiveTab} />
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-24 pt-4 sm:pb-8">
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
                  description="Review the host band and any co-hosts you want on this new gig."
                >
                  <GigLineupItem
                    name={bandName}
                    subtitle="Host Band"
                    tone="host"
                  />

                  {selectedCohostBands.map((band) => (
                    <GigLineupItem
                      key={band._id}
                      name={band.name}
                      subtitle="Co-host"
                      tone="accepted"
                      actionLabel="Remove"
                      onAction={() =>
                        setSelectedCohostBandIds((prev) =>
                          prev.filter((id) => id !== band._id),
                        )
                      }
                    />
                  ))}

                  {selectedCohostBands.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                      No co-hosts selected yet.
                    </div>
                  ) : null}
                </GigSectionCard>

                <GigSectionCard
                  title="Invite Co-host"
                  description="Search for another band and add them to the lineup before publishing."
                >
                  <GigBandSearchInput
                    value={cohostSearch}
                    onChange={setCohostSearch}
                    placeholder="Search bands to invite..."
                  />
                  {cohostResults.length > 0 ? (
                    <div className="overflow-hidden rounded-xl border border-border">
                      {cohostResults.map((band) => (
                        <button
                          key={band._id}
                          type="button"
                          onClick={() => {
                            setSelectedCohostBandIds((prev) => [...prev, band._id]);
                            setCohostSearch("");
                          }}
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
              />
            )}
          </div>
        </div>

        <GigModalFooter
          onCancel={handleClose}
          cancelDisabled={isSubmitting}
          primaryLabel="Create Gig"
          primaryBusyLabel="Creating..."
          primaryDisabled={isSubmitting}
          isBusy={isSubmitting}
        />
      </form>
    </GigModalShell>
  );
}
