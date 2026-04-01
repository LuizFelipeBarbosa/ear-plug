"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TabPanelProps {
  isActive: boolean;
  children: ReactNode;
  className?: string;
}

export function TabPanel({ isActive, children, className }: TabPanelProps) {
  return (
    <div
      hidden={!isActive}
      aria-hidden={!isActive}
      className={cn(!isActive && "hidden", className)}
    >
      {children}
    </div>
  );
}
