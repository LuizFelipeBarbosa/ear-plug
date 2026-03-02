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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
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
              onClick={handleClose}
              disabled={isSubmitting}
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

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-card pt-2 pb-4 border-t border-border flex gap-3">
            <button
              type="button"
              onClick={handleClose}
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
