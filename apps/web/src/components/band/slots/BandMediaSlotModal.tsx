"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Loader2, Play, Trash2, X, MapPin, FileText, ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CityAutocomplete } from "@/components/ui/CityAutocomplete";
import { cn } from "@/lib/utils";
import type { BandMediaSlotIndex, BandPostMediaType } from "@ear-plug/shared/types";
import { BAND_MEDIA_FILE_INPUT_ACCEPT } from "@ear-plug/shared/constants";

const MAX_CAPTION_LENGTH = 120;
const PLACEHOLDER_SRC = "/images/band-slot-placeholder.svg";

interface BandMediaSlotModalSlot {
  slotIndex: BandMediaSlotIndex;
  isFilled: boolean;
  mediaType?: BandPostMediaType;
  mediaUrl?: string | null;
  caption?: string;
  location?: string;
  durationSeconds?: number;
  canEdit: boolean;
}

interface BandMediaSlotModalProps {
  slot: BandMediaSlotModalSlot;
  onClose: () => void;
  onSave: (input: {
    slotIndex: BandMediaSlotIndex;
    caption?: string;
    location?: string;
    file?: File;
  }) => Promise<void>;
  onClear: (slotIndex: BandMediaSlotIndex) => Promise<void>;
}

function detectMediaType(file: File): "image" | "video" | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return null;
}

export function BandMediaSlotModal({ slot, onClose, onSave, onClear }: BandMediaSlotModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [caption, setCaption] = useState(slot.caption ?? "");
  const [location, setLocation] = useState(slot.location ?? "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<"image" | "video" | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const previewUrl = useMemo(() => {
    if (!selectedFile) return undefined;
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const previewMediaType = selectedFileType ?? slot.mediaType;
  const previewMediaUrl = previewUrl ?? slot.mediaUrl;
  const canSave = slot.canEdit && (selectedFile !== null || slot.isFilled);

  const triggerFilePicker = () => {
    if (!slot.canEdit) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const mediaType = detectMediaType(file);
    if (!mediaType) {
      setError("Please select a valid image (JPEG, PNG, WEBP) or video (MP4, WEBM, MOV) file.");
      return;
    }

    setSelectedFile(file);
    setSelectedFileType(mediaType);
    setError(null);
  };

  const handleSave = async () => {
    if (!canSave) return;

    setIsSaving(true);
    setError(null);
    try {
      await onSave({
        slotIndex: slot.slotIndex,
        caption,
        location,
        file: selectedFile ?? undefined,
      });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save slot.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setIsClearing(true);
    setError(null);
    try {
      await onClear(slot.slotIndex);
      onClose();
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : "Failed to clear slot.");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative w-full max-w-4xl max-h-[90vh] bg-card border border-border rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <motion.button

          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-20 p-2 bg-black/50 backdrop-blur-sm border border-white/20 text-white hover:bg-black/70 rounded-xl transition-colors"
        >
          <X className="w-4 h-4" />
        </motion.button>

        {/* Media Preview */}
        <div className="md:flex-[3] bg-black flex items-center justify-center min-h-[35vh] md:min-h-full relative">
          {slot.canEdit && (
            <input
              ref={fileInputRef}
              type="file"
              accept={BAND_MEDIA_FILE_INPUT_ACCEPT}
              className="hidden"
              onChange={handleFileChange}
            />
          )}

          {previewMediaUrl ? (
            previewMediaType === "video" ? (
              <video src={previewMediaUrl} controls className="max-h-full max-w-full" />
            ) : (
              <img
                src={previewMediaUrl}
                alt="Slot media preview"
                className="max-h-full max-w-full object-contain"
              />
            )
          ) : (
            <button
              type="button"
              onClick={triggerFilePicker}
              disabled={!slot.canEdit}
              className={cn(
                "relative h-full w-full flex flex-col items-center justify-center gap-3",
                slot.canEdit ? "cursor-pointer" : "cursor-default"
              )}
            >
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-white/60" />
              </div>
              {slot.canEdit ? (
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-band text-white text-sm font-medium rounded-xl hover:bg-band/90 transition-colors">
                  <ImagePlus className="w-4 h-4" />
                  Choose File
                </span>
              ) : (
                <span className="text-sm text-white/60">No media in this slot</span>
              )}
            </button>
          )}

          {/* Replace File Button */}
          {slot.canEdit && previewMediaUrl && (
            <motion.button

              type="button"
              onClick={triggerFilePicker}
              className="absolute bottom-4 right-4 px-3 py-2 bg-black/70 backdrop-blur-sm border border-white/20 text-white text-xs font-medium rounded-lg hover:bg-black/90 transition-colors flex items-center gap-1.5"
            >
              <ImagePlus className="w-3.5 h-3.5" />
              Replace
            </motion.button>
          )}

          {/* Video Badge */}
          {previewMediaType === "video" && previewMediaUrl && (
            <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/70 backdrop-blur-sm border border-white/20 rounded-lg flex items-center gap-1.5">
              <Play className="w-3 h-3 text-white fill-white" />
              <span className="text-xs text-white font-medium">Video</span>
            </div>
          )}
        </div>

        {/* Form Panel */}
        <div className="md:flex-[2] border-t md:border-t-0 md:border-l border-border p-5 flex flex-col gap-4 overflow-y-auto max-h-[50vh] md:max-h-none">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-band/10 rounded-lg flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-band" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Slot {slot.slotIndex + 1}</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              {slot.canEdit
                ? slot.isFilled
                  ? "Replace media or edit details"
                  : "Add media to this slot"
                : "View-only preview"}
            </p>
          </div>

          {/* File Info */}
          {slot.canEdit && (
            <div className="p-3 bg-muted/50 border border-border rounded-xl">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">Supported formats:</span>
                <br />
                Images: JPEG, PNG, WEBP (max 10MB)
                <br />
                Videos: MP4, WEBM, MOV (max 150MB)
              </p>
            </div>
          )}

          {/* Form Fields */}
          {slot.canEdit ? (
            <>
              {/* Location */}
              <div>
                <CityAutocomplete
                  value={location}
                  onChange={(city) => setLocation(city as string)}
                  placeholder="e.g., San Francisco, CA"
                  label="Event Location"
                  disabled={!slot.canEdit}
                />
              </div>

              {/* Caption */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  Caption
                </label>
                <textarea
                  value={caption}
                  onChange={(event) =>
                    setCaption(event.target.value.slice(0, MAX_CAPTION_LENGTH))
                  }
                  placeholder="Add a short description..."
                  disabled={!slot.canEdit}
                  rows={3}
                  className={cn(
                    "w-full resize-none bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-band/50 focus:ring-2 focus:ring-band/10 transition-all",
                    !slot.canEdit && "opacity-70 cursor-not-allowed"
                  )}
                />
                <p className="text-[10px] text-muted-foreground text-right mt-1.5">
                  {caption.length}/{MAX_CAPTION_LENGTH}
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {/* Read-only Location */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  Event Location
                </label>
                <div className="p-3 bg-muted/50 border border-border rounded-xl">
                  <p className="text-sm text-muted-foreground">
                    {slot.location || "No location set"}
                  </p>
                </div>
              </div>

              {/* Read-only Caption */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  Caption
                </label>
                <div className="p-3 bg-muted/50 border border-border rounded-xl min-h-[80px]">
                  <p className="text-sm text-muted-foreground">
                    {slot.caption || "No caption"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl"
              >
                <p className="text-xs text-red-500">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="mt-auto pt-2 flex items-center justify-end gap-2">
            <motion.button

              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-xl"
            >
              Cancel
            </motion.button>

            {slot.canEdit && slot.isFilled && (
              <motion.button
  
                type="button"
                onClick={handleClear}
                disabled={isClearing || isSaving}
                className="px-4 py-2.5 text-sm font-medium border border-red-500/30 text-red-500 hover:bg-red-500/10 disabled:opacity-60 rounded-xl transition-colors flex items-center gap-1.5"
              >
                {isClearing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Remove
              </motion.button>
            )}

            {slot.canEdit && (
              <motion.button
  
                type="button"
                onClick={handleSave}
                disabled={!canSave || isSaving || isClearing}
                className={cn(
                  "px-5 py-2.5 text-sm font-medium rounded-xl transition-all flex items-center gap-1.5",
                  !canSave || isSaving || isClearing
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-band text-white hover:bg-band/90 shadow-lg shadow-band/25"
                )}
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
