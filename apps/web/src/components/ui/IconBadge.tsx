"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface IconBadgeProps {
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_STYLES = {
  sm: "h-7 w-7 rounded-lg [&_svg]:h-3.5 [&_svg]:w-3.5",
  md: "h-8 w-8 rounded-xl [&_svg]:h-4 [&_svg]:w-4",
  lg: "h-10 w-10 rounded-xl [&_svg]:h-5 [&_svg]:w-5",
} as const;

export function IconBadge({
  children,
  className,
  size = "md",
}: IconBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center border border-border/70 bg-muted/60 text-muted-foreground leading-none [&_svg]:shrink-0",
        SIZE_STYLES[size],
        className,
      )}
    >
      {children}
    </span>
  );
}
