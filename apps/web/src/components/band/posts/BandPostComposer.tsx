"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BandPostMediaType } from "@ear-plug/shared/types";

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 150 * 1024 * 1024;
const MAX_VIDEO_DURATION_SECONDS = 90;
const MAX_CAPTION_LENGTH = 2200;

interface BandPostComposerProps {
  onSubmit: (input: {
    file: File;
    mediaType: BandPostMediaType;
    caption?: string;
    durationSeconds?: number;
  }) => Promise<void>;
}

async function getVideoDuration(file: File): Promise<number> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const duration = await new Promise<number>((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        resolve(video.duration || 0);
      };
      video.onerror = () => {
        reject(new Error("Unable to read video metadata"));
      };
      video.src = objectUrl;
    });
    return duration;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function BandPostComposer({ onSubmit }: BandPostComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<BandPostMediaType | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | undefined>(
    undefined
  );
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedFile]);

  const resetState = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setMediaType(null);
    setDurationSeconds(undefined);
    setCaption("");
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError(null);
    const detectedType = file.type.startsWith("video/")
      ? "video"
      : file.type.startsWith("image/")
        ? "image"
        : null;

    if (!detectedType) {
      setError("Select a valid image or video file.");
      return;
    }

    if (detectedType === "image") {
      if (!IMAGE_MIME_TYPES.has(file.type)) {
        setError("Image format must be JPEG, PNG, or WEBP.");
        return;
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setError("Image size must be 10 MB or less.");
        return;
      }
    }

    if (detectedType === "video") {
      if (!VIDEO_MIME_TYPES.has(file.type)) {
        setError("Video format must be MP4, WEBM, or MOV.");
        return;
      }
      if (file.size > MAX_VIDEO_SIZE_BYTES) {
        setError("Video size must be 150 MB or less.");
        return;
      }

      try {
        const duration = await getVideoDuration(file);
        if (duration <= 0 || duration > MAX_VIDEO_DURATION_SECONDS) {
          setError("Videos must be at most 90 seconds.");
          return;
        }
        setDurationSeconds(Math.ceil(duration));
      } catch (durationError) {
        console.error(durationError);
        setError("Unable to read video duration.");
        return;
      }
    } else {
      setDurationSeconds(undefined);
    }

    setSelectedFile(file);
    setMediaType(detectedType);
  };

  const handleSubmit = async () => {
    if (!selectedFile || !mediaType) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        file: selectedFile,
        mediaType,
        caption: caption.trim() || undefined,
        durationSeconds: mediaType === "video" ? durationSeconds : undefined,
      });
      resetState();
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Failed to publish post";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-night-tertiary border-2 border-zinc-800 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          New Post
        </h4>
        {mediaType === "video" && durationSeconds !== undefined ? (
          <span className="text-[10px] font-bold uppercase tracking-wider text-violet">
            {durationSeconds}s
          </span>
        ) : null}
      </div>

      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "w-28 h-28 border-2 border-dashed border-zinc-700 bg-night-secondary overflow-hidden flex-shrink-0",
            "hover:border-lime/50 transition-colors flex items-center justify-center"
          )}
          disabled={isSubmitting}
        >
          {previewUrl ? (
            mediaType === "image" ? (
              <img
                src={previewUrl}
                alt="Post preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="relative w-full h-full">
                <video
                  src={previewUrl}
                  className="w-full h-full object-cover"
                  muted
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Video className="w-5 h-5 text-white" />
                </div>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center gap-1 text-zinc-500">
              <ImagePlus className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Add Media
              </span>
            </div>
          )}
        </button>

        <div className="flex-1 space-y-2">
          <textarea
            value={caption}
            onChange={(event) => setCaption(event.target.value.slice(0, MAX_CAPTION_LENGTH))}
            placeholder="Write a caption..."
            className="w-full h-20 resize-none bg-night-secondary border border-zinc-800 p-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-lime/50"
            disabled={isSubmitting}
          />
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider">
            <span className="text-zinc-500">
              JPEG/PNG/WEBP up to 10 MB • MP4/WEBM/MOV up to 150 MB
            </span>
            <span className="text-zinc-500">{caption.length}/{MAX_CAPTION_LENGTH}</span>
          </div>
        </div>
      </div>

      {error ? <p className="text-xs text-red-400">{error}</p> : null}

      <div className="flex items-center justify-end gap-2">
        {selectedFile ? (
          <button
            type="button"
            onClick={resetState}
            disabled={isSubmitting}
            className="px-3 py-2 text-xs font-bold uppercase tracking-wider border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
          >
            Clear
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !selectedFile || !mediaType}
          className={cn(
            "px-4 py-2 text-xs font-bold uppercase tracking-wider border-2 transition-colors flex items-center gap-2",
            isSubmitting || !selectedFile || !mediaType
              ? "border-zinc-700 text-zinc-500"
              : "border-lime bg-lime text-night hover:bg-transparent hover:text-lime"
          )}
        >
          {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Publish
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
