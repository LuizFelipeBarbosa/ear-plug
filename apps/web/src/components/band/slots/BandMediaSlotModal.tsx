"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Loader2, Pause, Play, Trash2, X, MapPin, ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CityAutocomplete } from "@/components/ui/CityAutocomplete";
import { cn } from "@/lib/utils";
import type { BandMediaSlotIndex, BandPostMediaType } from "@ear-plug/shared/types";
import { BAND_MEDIA_FILE_INPUT_ACCEPT } from "@ear-plug/shared/constants";
import Image from "next/image";

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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hideVideoControlTimeoutRef = useRef<number | null>(null);
  const [caption, setCaption] = useState(slot.caption ?? "");
  const [location, setLocation] = useState(slot.location ?? "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<"image" | "video" | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [showVideoControl, setShowVideoControl] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      if (hideVideoControlTimeoutRef.current !== null) {
        window.clearTimeout(hideVideoControlTimeoutRef.current);
      }
      videoRef.current?.pause();
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
  const overlayLocation = location.trim() || slot.location?.trim();
  const overlayCaption = caption.trim() || slot.caption?.trim();
  const hasOverlayMeta = Boolean(overlayLocation || overlayCaption);
  const showCenteredVideoControl =
    previewMediaType === "video" && previewMediaUrl
      ? !isVideoPlaying || showVideoControl
      : false;

  const clearVideoControlTimeout = () => {
    if (hideVideoControlTimeoutRef.current !== null) {
      window.clearTimeout(hideVideoControlTimeoutRef.current);
      hideVideoControlTimeoutRef.current = null;
    }
  };

  const scheduleVideoControlHide = () => {
    clearVideoControlTimeout();
    hideVideoControlTimeoutRef.current = window.setTimeout(() => {
      setShowVideoControl(false);
      hideVideoControlTimeoutRef.current = null;
    }, 900);
  };

  useEffect(() => {
    clearVideoControlTimeout();
    setIsVideoPlaying(false);
    setShowVideoControl(false);
    videoRef.current?.pause();
  }, [previewMediaType, previewMediaUrl]);

  const triggerFilePicker = () => {
    if (!slot.canEdit) return;
    fileInputRef.current?.click();
  };

  const handleVideoToggle = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused || video.ended) {
      try {
        await video.play();
        setShowVideoControl(true);
        scheduleVideoControlHide();
      } catch (playError) {
        setError(
          playError instanceof Error ? playError.message : "Unable to play video."
        );
      }
      return;
    }

    clearVideoControlTimeout();
    video.pause();
    setShowVideoControl(false);
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
        className={cn(
          "relative w-full max-h-[90vh] bg-card border border-border rounded-2xl overflow-hidden shadow-2xl",
          slot.canEdit ? "max-w-4xl flex flex-col md:flex-row" : "max-w-3xl"
        )}
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
        <div
          className={cn(
            "relative bg-black flex items-center justify-center overflow-hidden",
            slot.canEdit
              ? "min-h-[35vh] md:min-h-full md:flex-[3]"
              : "min-h-[70vh] max-h-[calc(90vh-2px)]"
          )}
        >
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
              <div className="absolute inset-0 flex items-center justify-center">
                <video
                  ref={videoRef}
                  src={previewMediaUrl}
                  playsInline
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
                  onEnded={() => {
                    clearVideoControlTimeout();
                    setIsVideoPlaying(false);
                    setShowVideoControl(false);
                  }}
                  className="absolute inset-0 h-full w-full object-cover"
                />

                <button
                  type="button"
                  onClick={handleVideoToggle}
                  className="absolute inset-0 z-[1] touch-target"
                  aria-label={isVideoPlaying ? "Pause video" : "Play video"}
                />

                <AnimatePresence initial={false}>
                  {showCenteredVideoControl ? (
                    <motion.div
                      key={isVideoPlaying ? "pause" : "play"}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.18 }}
                      className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center"
                    >
                      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-black/50 backdrop-blur-sm">
                        {isVideoPlaying ? (
                          <Pause className="h-7 w-7 text-white" />
                        ) : (
                          <Play className="ml-1 h-7 w-7 fill-white text-white" />
                        )}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            ) : (
              <Image
                src={previewMediaUrl}
                alt="Slot media preview"
                fill
                className="object-contain"
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

          {previewMediaUrl && hasOverlayMeta ? (
            <div
              className={cn(
                "pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-4 pb-4 pt-16 text-white"
              )}
            >
              <div className="max-w-[24rem] space-y-2">
                {overlayLocation ? (
                  <div className="flex items-center gap-2 text-sm font-medium text-white/90">
                    <MapPin className="h-4 w-4 shrink-0 text-white/75" />
                    <span className="truncate">{overlayLocation}</span>
                  </div>
                ) : null}
                {overlayCaption ? (
                  <p className="text-sm leading-5 text-white/95 sm:text-[15px]">
                    {overlayCaption}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Replace File Button */}
          {slot.canEdit && previewMediaUrl && (
            <motion.button

              type="button"
              onClick={triggerFilePicker}
              className="absolute bottom-4 right-4 z-[12] px-3 py-2 bg-black/70 backdrop-blur-sm border border-white/20 text-white text-xs font-medium rounded-lg hover:bg-black/90 transition-colors flex items-center gap-1.5"
            >
              <ImagePlus className="w-3.5 h-3.5" />
              Replace
            </motion.button>
          )}
        </div>

        {/* Form Panel */}
        {slot.canEdit ? (
          <div className="md:flex-[2] border-t md:border-t-0 md:border-l border-border p-4 flex flex-col gap-3 overflow-y-auto max-h-[50vh] md:max-h-none">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-band/10 rounded-lg flex items-center justify-center">
                  <ImageIcon className="w-4 h-4 text-band" />
                </div>
                <h3 className="text-base font-semibold text-foreground">Slot {slot.slotIndex + 1}</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                {slot.isFilled ? "Replace media or edit details" : "Add media to this slot"}
              </p>
            </div>

            <div>
              <CityAutocomplete
                value={location}
                onChange={(city) => setLocation(city as string)}
                placeholder="e.g., San Francisco, CA"
                disabled={!slot.canEdit}
              />
            </div>

            <div>
              <textarea
                value={caption}
                onChange={(event) =>
                  setCaption(event.target.value.slice(0, MAX_CAPTION_LENGTH))
                }
                placeholder="Add a short description..."
                disabled={!slot.canEdit}
                rows={2}
                className={cn(
                  "w-full resize-none bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-band/50 focus:ring-2 focus:ring-band/10 transition-all",
                  !slot.canEdit && "opacity-70 cursor-not-allowed"
                )}
              />
              <p className="text-[10px] text-muted-foreground text-right mt-1.5">
                {caption.length}/{MAX_CAPTION_LENGTH}
              </p>
            </div>

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

            <div className="mt-auto pt-2 flex items-center justify-end gap-2">
              <motion.button

                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-xl"
              >
                Cancel
              </motion.button>

              {slot.isFilled && (
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
            </div>
          </div>
        ) : null}
      </motion.div>
    </motion.div>
  );
}
