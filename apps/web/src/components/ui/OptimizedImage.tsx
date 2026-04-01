"use client";
import { useState } from "react";
import Image, { ImageProps } from "next/image";
import { cn } from "@/lib/utils";
interface OptimizedImageProps extends Omit<ImageProps, "onLoadingComplete"> {
  fallback?: React.ReactNode;
  showLoadingState?: boolean;
  aspectRatio?: "square" | "video" | "portrait" | "wide";
}
export function OptimizedImage({
  className,
  fallback,
  showLoadingState = true,
  aspectRatio,
  alt,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const aspectRatioClass = aspectRatio
    ? {
        square: "aspect-square",
        video: "aspect-video",
        portrait: "aspect-[3/4]",
        wide: "aspect-[16/9]",
      }[aspectRatio] || ""
    : "";
  if (hasError && fallback) {
    return <>{fallback}</>;
  }
  return (
    <div
      className={cn("relative overflow-hidden", aspectRatioClass, className)}
    >
      {showLoadingState && !hasError && (
        <div
          className={cn(
            "absolute inset-0 bg-muted pointer-events-none transition-opacity duration-200",
            isLoading ? "opacity-100 animate-shimmer" : "opacity-0",
          )}
        />
      )}
      <Image
        {...props}
        alt={alt}
        className={cn(
          "object-cover transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          props.fill ? "" : "w-full h-full",
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />
    </div>
  );
}

// Avatar with fallback initials
interface AvatarImageProps {
  src?: string | null;
  alt: string;
  size?: number;
  fallbackText?: string;
  className?: string;
}
export function AvatarImage({
  src,
  alt,
  size = 48,
  fallbackText,
  className,
}: AvatarImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const initials = fallbackText
    ? fallbackText
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : alt.charAt(0).toUpperCase();
  const showFallback = !src || hasError;
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-full bg-muted",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {showFallback ? (
        <div className="w-full h-full flex items-center justify-center text-foreground font-bold">
          <span style={{ fontSize: size * 0.4 }}>{initials}</span>
        </div>
      ) : (
        <>
          <div
            className={cn(
              "absolute inset-0 bg-muted pointer-events-none transition-opacity duration-200",
              isLoading ? "opacity-100 animate-shimmer" : "opacity-0",
            )}
          />
          <Image
            src={src}
            alt={alt}
            width={size}
            height={size}
            className={cn(
              "object-cover w-full h-full transition-opacity duration-300",
              isLoading ? "opacity-0" : "opacity-100",
            )}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />
        </>
      )}
    </div>
  );
}

// Event image with gradient fallback
interface EventImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
}
export function EventImage({
  src,
  alt,
  className,
  priority = false,
}: EventImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Fallback gradient */}
      {(!src || hasError) && (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-200 to-zinc-400 dark:from-zinc-700 dark:to-zinc-500" />
      )}
      {/* Loading state */}
      {src && !hasError && (
        <div
          className={cn(
            "absolute inset-0 bg-muted pointer-events-none transition-opacity duration-200",
            isLoading ? "opacity-100 animate-shimmer" : "opacity-0",
          )}
        />
      )}
      {/* Actual image */}
      {src && !hasError && (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          className={cn(
            "object-cover transition-opacity duration-300",
            isLoading ? "opacity-0" : "opacity-100",
          )}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
      )}
    </div>
  );
}
