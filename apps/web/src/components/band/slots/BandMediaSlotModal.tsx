"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Loader2, Play, Trash2, X } from "lucide-react";
import { CityAutocomplete } from "@/components/ui/CityAutocomplete";
import { cn } from "@/lib/utils";
import type {
  BandMediaSlotIndex,
  BandPostMediaType,
} from "@ear-plug/shared/types";
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
  if (file.type.startsWith("image/")) {
    return "image";
  }
  if (file.type.startsWith("video/")) {
    return "video";
  }
  return null;
}
export function BandMediaSlotModal({
  slot,
  onClose,
  onSave,
  onClear,
}: BandMediaSlotModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [caption, setCaption] = useState(slot.caption ?? "");
  const [location, setLocation] = useState(slot.location ?? "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<
    "image" | "video" | null
  >(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);
  const previewUrl = useMemo(() => {
    if (!selectedFile) {
      return undefined;
    }
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);
  const previewMediaType = selectedFileType ?? slot.mediaType;
  const previewMediaUrl = previewUrl ?? slot.mediaUrl;
  const canSave = slot.canEdit && (selectedFile !== null || slot.isFilled);
  const triggerFilePicker = () => {
    if (!slot.canEdit) {
      return;
    }
    fileInputRef.current?.click();
  };
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const mediaType = detectMediaType(file);
    if (!mediaType) {
      setError("Please select a valid image or video file.");
      return;
    }
    setSelectedFile(file);
    setSelectedFileType(mediaType);
    setError(null);
  };
  const handleSave = async () => {
    if (!canSave) {
      return;
    }
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
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save slot.",
      );
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
      setError(
        clearError instanceof Error
          ? clearError.message
          : "Failed to clear slot.",
      );
    } finally {
      setIsClearing(false);
    }
  };
  return (
    <div className="fixed inset-0 z-[90] bg-black/85 flex items-center justify-center p-2 sm:p-4">
      {" "}
      <div className="relative w-full max-w-4xl h-[88vh] bg-card border-2 border-border overflow-hidden flex flex-col md:flex-row">
        {" "}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 z-20 p-2 bg-black/70 border border-border text-muted-foreground hover:text-foreground"
        >
          {" "}
          <X className="w-4 h-4" />{" "}
        </button>{" "}
        <div className="md:flex-[3] bg-black flex items-center justify-center min-h-[40vh] md:min-h-full relative">
          {" "}
          {slot.canEdit ? (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
              className="hidden"
              onChange={handleFileChange}
            />
          ) : null}{" "}
          {previewMediaUrl ? (
            previewMediaType === "video" ? (
              <video
                src={previewMediaUrl}
                controls
                className="max-h-full max-w-full"
              />
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
                "relative h-full w-full flex items-center justify-center",
                slot.canEdit ? "cursor-pointer" : "cursor-default",
              )}
            >
              {" "}
              <img
                src={PLACEHOLDER_SRC}
                alt="Empty slot"
                className="max-h-full max-w-full object-cover opacity-80"
              />{" "}
              {slot.canEdit ? (
                <span className="absolute inline-flex items-center gap-2 px-3 py-2 border border-band/60 bg-black/70 text-xs font-bold text-zinc-100">
                  {" "}
                  <ImagePlus className="w-4 h-4" /> Choose File{" "}
                </span>
              ) : null}{" "}
            </button>
          )}{" "}
          {slot.canEdit && previewMediaUrl ? (
            <button
              type="button"
              onClick={triggerFilePicker}
              className="absolute bottom-3 right-3 px-2.5 py-1.5 bg-black/75 border border-zinc-600 text-[10px] text-zinc-100 font-bold inline-flex items-center gap-1.5 hover:border-band/60 transition-colors"
            >
              {" "}
              <ImagePlus className="w-3.5 h-3.5" /> Replace File{" "}
            </button>
          ) : null}{" "}
          {previewMediaType === "video" && previewMediaUrl ? (
            <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/70 border border-border text-[10px] text-zinc-100 font-bold inline-flex items-center gap-1">
              {" "}
              <Play className="w-3 h-3 fill-white" /> Video{" "}
            </div>
          ) : null}{" "}
        </div>{" "}
        <div className="md:flex-[2] border-t-2 md:border-t-0 md:border-l-2 border-border p-4 flex flex-col gap-4">
          {" "}
          <div>
            {" "}
            <h3 className="text-sm font-bold text-foreground ">
              {" "}
              Slot {slot.slotIndex + 1}{" "}
            </h3>{" "}
            <p className="text-xs text-muted-foreground mt-1">
              {" "}
              {slot.canEdit
                ? slot.isFilled
                  ? "Replace media or edit caption"
                  : "Add media to this slot"
                : slot.isFilled
                  ? "Read-only preview"
                  : "No media in this slot"}{" "}
            </p>{" "}
          </div>{" "}
          {slot.canEdit ? (
            <p className="text-[10px] text-muted-foreground ">
              {" "}
              Upload limits: JPEG/PNG/WEBP up to 10MB • MP4/WEBM/MOV up to
              150MB{" "}
            </p>
          ) : null}{" "}
          {slot.canEdit ? (
            <>
              {" "}
              <div className="space-y-2">
                {" "}
                <CityAutocomplete
                  value={location}
                  onChange={setLocation}
                  placeholder="e.g., San Francisco, CA"
                  label="Event Location"
                  disabled={!slot.canEdit}
                />{" "}
              </div>{" "}
              <div className="space-y-2">
                {" "}
                <label className="text-xs font-bold text-muted-foreground">
                  {" "}
                  Tiny Caption{" "}
                </label>{" "}
                <textarea
                  value={caption}
                  onChange={(event) =>
                    setCaption(event.target.value.slice(0, MAX_CAPTION_LENGTH))
                  }
                  placeholder="Optional caption"
                  disabled={!slot.canEdit}
                  className={cn(
                    "w-full h-24 resize-none bg-muted border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none",
                    slot.canEdit
                      ? "focus:border-band/50"
                      : "opacity-70 cursor-not-allowed",
                  )}
                />{" "}
                <p className="text-[10px] text-muted-foreground text-right">
                  {" "}
                  {caption.length}/{MAX_CAPTION_LENGTH}{" "}
                </p>{" "}
              </div>{" "}
            </>
          ) : (
            <div className="space-y-3">
              {" "}
              <div className="space-y-1">
                {" "}
                <p className="text-xs font-bold text-muted-foreground">
                  {" "}
                  Event Location{" "}
                </p>{" "}
                <p className="text-sm text-muted-foreground bg-muted border border-border px-3 py-2">
                  {" "}
                  {slot.location || "No location"}{" "}
                </p>{" "}
              </div>{" "}
              <div className="space-y-1">
                {" "}
                <p className="text-xs font-bold text-muted-foreground">
                  {" "}
                  Tiny Caption{" "}
                </p>{" "}
                <p className="text-sm text-muted-foreground bg-muted border border-border px-3 py-2 min-h-[64px]">
                  {" "}
                  {slot.caption || "No caption"}{" "}
                </p>{" "}
              </div>{" "}
            </div>
          )}{" "}
          {error ? (
            <p className="text-xs text-red-400 border border-red-500/30 bg-red-500/10 px-3 py-2">
              {" "}
              {error}{" "}
            </p>
          ) : null}{" "}
          <div className="mt-auto flex items-center justify-end gap-2">
            {" "}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-bold border border-border text-muted-foreground hover:text-foreground hover:border-zinc-500 transition-colors"
            >
              {" "}
              Cancel{" "}
            </button>{" "}
            {slot.canEdit && slot.isFilled ? (
              <button
                type="button"
                onClick={handleClear}
                disabled={isClearing || isSaving}
                className="px-3 py-2 text-xs font-bold border border-red-500/40 text-red-400 hover:bg-red-500/10 disabled:opacity-60 inline-flex items-center gap-1"
              >
                {" "}
                {isClearing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}{" "}
                Remove{" "}
              </button>
            ) : null}{" "}
            {slot.canEdit ? (
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave || isSaving || isClearing}
                className={cn(
                  "px-4 py-2 text-xs font-bold border-2 inline-flex items-center gap-1",
                  !canSave || isSaving || isClearing
                    ? "border-border text-muted-foreground"
                    : "border-band bg-band text-foreground hover:bg-transparent hover:text-band transition-colors",
                )}
              >
                {" "}
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : null}{" "}
                Save{" "}
              </button>
            ) : null}{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
