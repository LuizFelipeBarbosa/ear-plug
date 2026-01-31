"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular" | "rounded";
  width?: string | number;
  height?: string | number;
  animation?: "pulse" | "wave" | "none";
}

export function Skeleton({
  className,
  variant = "rectangular",
  width,
  height,
  animation = "pulse",
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "bg-gray-200 dark:bg-gray-800",
        animation === "pulse" && "animate-pulse",
        animation === "wave" && "animate-shimmer",
        variant === "circular" && "rounded-full",
        variant === "rounded" && "rounded-xl",
        variant === "text" && "rounded h-4",
        className
      )}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
      }}
    />
  );
}

// Pre-built skeleton variants
export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-surface-dark-secondary rounded-xl p-4 space-y-3">
      <Skeleton variant="rounded" className="h-40 w-full" />
      <Skeleton variant="text" className="h-5 w-3/4" />
      <Skeleton variant="text" className="h-4 w-1/2" />
      <div className="flex gap-2">
        <Skeleton variant="text" className="h-4 w-20" />
        <Skeleton variant="text" className="h-4 w-16" />
      </div>
    </div>
  );
}

export function SkeletonEventCard() {
  return (
    <div className="bg-white dark:bg-surface-dark-secondary rounded-xl p-4 flex gap-4">
      <Skeleton variant="rounded" className="w-20 h-20 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" className="h-5 w-3/4" />
        <Skeleton variant="text" className="h-4 w-1/2" />
        <Skeleton variant="text" className="h-4 w-1/3" />
      </div>
    </div>
  );
}

export function SkeletonAvatar({ size = 48 }: { size?: number }) {
  return (
    <Skeleton
      variant="circular"
      width={size}
      height={size}
    />
  );
}

export function SkeletonButton() {
  return (
    <Skeleton variant="rounded" className="h-12 w-full" />
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonEventCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonProfile() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <SkeletonAvatar size={80} />
        <div className="space-y-2">
          <Skeleton variant="text" className="h-6 w-32" />
          <Skeleton variant="text" className="h-4 w-24" />
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rounded" className="h-24" />
        ))}
      </div>
      
      {/* Content sections */}
      <div className="space-y-4">
        <Skeleton variant="text" className="h-6 w-40" />
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" className="h-10 w-20" />
          ))}
        </div>
      </div>
    </div>
  );
}
