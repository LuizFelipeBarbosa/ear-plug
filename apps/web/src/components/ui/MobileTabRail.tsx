"use client";

import type { ElementType } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type RailTone = "band" | "fan" | "neutral";

export interface MobileTabRailItem {
  id: string;
  label: string;
  icon?: ElementType;
  count?: number | string;
  disabled?: boolean;
}

interface MobileTabRailProps {
  items: MobileTabRailItem[];
  activeTab: string;
  onChange: (id: string) => void;
  layoutId: string;
  tone?: RailTone;
  className?: string;
  railClassName?: string;
  buttonClassName?: string;
}

const TONE_STYLES: Record<
  RailTone,
  { activeText: string; activeBadge: string; indicator: string }
> = {
  band: {
    activeText: "text-band",
    activeBadge: "bg-band/15 text-band",
    indicator: "bg-band",
  },
  fan: {
    activeText: "text-fan",
    activeBadge: "bg-fan/15 text-fan",
    indicator: "bg-fan",
  },
  neutral: {
    activeText: "text-foreground",
    activeBadge: "bg-muted text-foreground",
    indicator: "bg-foreground",
  },
};

export function MobileTabRail({
  items,
  activeTab,
  onChange,
  layoutId,
  tone = "neutral",
  className,
  railClassName,
  buttonClassName,
}: MobileTabRailProps) {
  const styles = TONE_STYLES[tone];

  return (
    <div className={cn("overflow-x-auto no-scrollbar", className)}>
      <div className={cn("flex min-w-full items-center gap-1 px-4", railClassName)}>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeTab;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              disabled={item.disabled}
              className={cn(
                "relative inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors touch-target-sm",
                isActive
                  ? styles.activeText
                  : "text-muted-foreground hover:text-foreground",
                item.disabled && "cursor-not-allowed opacity-50",
                buttonClassName,
              )}
            >
              {Icon ? <Icon className="w-4 h-4" /> : null}
              <span className="whitespace-nowrap">{item.label}</span>
              {item.count !== undefined && item.count !== null ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    isActive
                      ? styles.activeBadge
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {item.count}
                </span>
              ) : null}
              {isActive ? (
                <motion.div
                  layoutId={layoutId}
                  className={cn(
                    "absolute bottom-0 left-0 right-0 h-0.5 rounded-full",
                    styles.indicator,
                  )}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
