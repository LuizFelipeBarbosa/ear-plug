"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  ImagePlus,
  X,
  Play,
  Loader2,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaItem {
  id: string;
  type: "image" | "video";
  url: string;
  thumbnail?: string;
  uploadedAt: number;
}

interface MediaGalleryProps {
  media: MediaItem[];
  onUpload?: (file: File) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  isEditable?: boolean;
}

export function MediaGallery({
  media,
  onUpload,
  onDelete,
  isEditable = false,
}: MediaGalleryProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;

    setIsUploading(true);
    try {
      await onUpload(file);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!onDelete) return;
    try {
      await onDelete(id);
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const nextImage = () => {
    if (lightboxIndex !== null && lightboxIndex < media.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    }
  };

  const prevImage = () => {
    if (lightboxIndex !== null && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    }
  };

  return (
    <div>
      {/* Gallery Grid */}
      <div className="grid grid-cols-3 gap-2">
        {/* Upload Button */}
        {isEditable && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={cn(
              "aspect-square rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700",
              "flex flex-col items-center justify-center gap-1",
              "text-gray-400 hover:text-gray-500 hover:border-gray-400",
              "dark:hover:text-gray-300 dark:hover:border-gray-600",
              "transition-colors",
              isUploading && "opacity-50 cursor-not-allowed"
            )}
          >
            {isUploading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <ImagePlus className="w-6 h-6" />
                <span className="text-xs">Add</span>
              </>
            )}
          </button>
        )}

        {/* Media Items */}
        {media.map((item, index) => (
          <div
            key={item.id}
            className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 group cursor-pointer"
            onClick={() => openLightbox(index)}
          >
            {item.type === "image" ? (
              <Image
                src={item.url}
                alt={`Media ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 33vw, 200px"
              />
            ) : (
              <>
                <Image
                  src={item.thumbnail || item.url}
                  alt={`Video ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 33vw, 200px"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                    <Play className="w-5 h-5 text-gray-900 ml-0.5" fill="currentColor" />
                  </div>
                </div>
              </>
            )}

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <ZoomIn className="w-6 h-6 text-white" />
            </div>

            {/* Delete Button */}
            {isEditable && onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(item.id);
                }}
                className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {media.length === 0 && !isEditable && (
        <div className="py-8 text-center text-gray-500 dark:text-gray-400">
          No media uploaded yet
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Lightbox */}
      {lightboxIndex !== null && media[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Navigation */}
          {lightboxIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              className="absolute left-4 p-2 text-white/80 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}
          {lightboxIndex < media.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              className="absolute right-4 p-2 text-white/80 hover:text-white transition-colors"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          {/* Image/Video */}
          <div
            className="max-w-[90vw] max-h-[90vh] relative"
            onClick={(e) => e.stopPropagation()}
          >
            {media[lightboxIndex].type === "image" ? (
              <img
                src={media[lightboxIndex].url}
                alt={`Media ${lightboxIndex + 1}`}
                className="max-w-full max-h-[90vh] object-contain"
              />
            ) : (
              <video
                src={media[lightboxIndex].url}
                controls
                autoPlay
                className="max-w-full max-h-[90vh]"
              />
            )}
          </div>

          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
            {lightboxIndex + 1} / {media.length}
          </div>
        </div>
      )}
    </div>
  );
}

// Placeholder gallery with demo data for development
export function DemoMediaGallery() {
  const [demoMedia, setDemoMedia] = useState<MediaItem[]>([
    {
      id: "1",
      type: "image",
      url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400",
      uploadedAt: Date.now() - 86400000,
    },
    {
      id: "2",
      type: "image",
      url: "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=400",
      uploadedAt: Date.now() - 172800000,
    },
    {
      id: "3",
      type: "image",
      url: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400",
      uploadedAt: Date.now() - 259200000,
    },
  ]);

  const handleUpload = async (file: File) => {
    // Simulate upload delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    // Create a local URL for the uploaded file
    const url = URL.createObjectURL(file);
    const newItem: MediaItem = {
      id: Date.now().toString(),
      type: file.type.startsWith("video") ? "video" : "image",
      url,
      uploadedAt: Date.now(),
    };
    setDemoMedia((prev) => [newItem, ...prev]);
  };

  const handleDelete = async (id: string) => {
    setDemoMedia((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <MediaGallery
      media={demoMedia}
      onUpload={handleUpload}
      onDelete={handleDelete}
      isEditable
    />
  );
}
