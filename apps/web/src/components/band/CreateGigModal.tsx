"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  Check,
  AlertCircle,
  Loader2,
  Music,
  UserPlus,
  Clock3,
} from "lucide-react";
import { useQuery } from "convex/react";
import { cn } from "@/lib/utils";
import { type VenueLocationData } from "@/components/ui/CityAutocomplete";
import { useSharedEvents } from "@/hooks/useSharedEvents";
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
import { GigModalShell } from "@/components/band/GigModalShell";
import { api } from "../../../../../convex/_generated/api";
import type { EventStatus } from "@ear-plug/shared/types";

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

  const removeImage = () => {
    setCoverImage(null);
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
        image: coverImage || undefined,
        genres: formData.genres.length > 0 ? formData.genres : undefined,
        capacity: parsedCapacity,
        description: formData.description.trim(),
        price: parsedPrice,
        status: formData.status,
        addressVisibility: formData.addressVisibility,
      });

      onSuccess?.();
      handleClose();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to create event"
      );
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
        <div className="border-b border-border bg-card/95 px-4 pt-4 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 sm:h-12 sm:w-12",
                  isTentative
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-500"
                    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-500",
                )}
              >
                {isTentative ? (
                  <Clock3 className="w-5 h-5 sm:w-6 sm:h-6" />
                ) : (
                  <Check className="w-5 h-5 sm:w-6 sm:h-6" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    id="create-gig-modal-title"
                    className="text-base font-bold text-foreground sm:text-lg"
                  >
                    {isTentative ? "Create Tentative Gig" : "Create Confirmed Gig"}
                  </h2>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                      isTentative
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-600"
                        : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
                    )}
                  >
                    {isTentative ? "Draft" : "Published"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add a new show for {bandName}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
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
                    <div className="rounded-xl border border-band/30 bg-band/10 p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-band/20">
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
                        className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <Music className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{band.name}</p>
                            <p className="text-xs text-muted-foreground">Co-host</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedCohostBandIds((prev) =>
                              prev.filter((id) => id !== band._id),
                            )
                          }
                          className="w-full rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500 transition-colors hover:bg-red-500/20 sm:w-auto"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

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
                    {cohostResults.length > 0 && (
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
              />
            )}
          </div>
        </div>

        <div className="safe-area-inset-bottom border-t border-border bg-card/95 px-4 pb-4 pt-3 backdrop-blur-xl">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="w-full rounded-xl bg-muted py-3 font-medium text-foreground transition-colors hover:bg-muted/80"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-band py-3 font-medium text-white transition-colors hover:bg-band/90 disabled:opacity-50"
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
        </div>
      </form>
    </GigModalShell>
  );
}
