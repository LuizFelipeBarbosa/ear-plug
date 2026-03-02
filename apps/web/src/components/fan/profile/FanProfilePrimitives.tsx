"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Calendar, Heart, MapPin, Ticket, Zap } from "lucide-react";
import { getInitials } from "@ear-plug/shared/utils";
import { cn } from "@/lib/utils";

export interface FanProfileStats {
  showsAttended: number;
  savedArtists: number;
  memberSince: string;
}

interface FanProfileHeaderCardProps {
  name: string;
  avatar?: string | null;
  location?: string | null;
  gigLabel?: string | null;
  stats: FanProfileStats;
  avatarAction?: ReactNode;
}

export function FanProfileHeaderCard({
  name,
  avatar,
  location,
  gigLabel,
  stats,
  avatarAction,
}: FanProfileHeaderCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="bg-card/80 backdrop-blur-xl border border-border rounded-2xl p-5 shadow-sm"
    >
      <div className="flex items-center gap-4">
        <div className="relative">
          <motion.div className="w-20 h-20 bg-gradient-to-br from-fan/20 to-fan/5 border-2 border-fan/20 rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0">
            {avatar ? (
              <Image
                src={avatar}
                alt={name}
                width={80}
                height={80}
                className="object-cover w-full h-full"
              />
            ) : (
              <span className="text-2xl font-bold text-fan">{getInitials(name)}</span>
            )}
          </motion.div>
          {avatarAction}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground truncate">{name}</h1>
          {location && (
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm mt-1">
              <MapPin className="w-3.5 h-3.5 text-fan" />
              <span className="truncate">{location}</span>
            </div>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-fan/10 text-fan text-[10px] font-medium rounded-full">
              <Zap className="w-3 h-3" />
              {gigLabel || "Music Explorer"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-border/50">
        <FanQuickStat icon={Ticket} value={stats.showsAttended} label="Shows" />
        <FanQuickStat icon={Heart} value={stats.savedArtists} label="Saved" />
        <FanQuickStat icon={Calendar} value={stats.memberSince} label="Joined" isText />
      </div>
    </motion.div>
  );
}

export function FanQuickStat({
  icon: Icon,
  value,
  label,
  isText = false,
}: {
  icon: React.ElementType;
  value: string | number;
  label: string;
  isText?: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <Icon className="w-4 h-4 text-muted-foreground mb-1" />
      <span
        className={cn(
          "font-semibold text-foreground",
          isText ? "text-xs" : "text-lg",
        )}
      >
        {value}
      </span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
    </div>
  );
}

export function FanSectionTitle({
  icon: Icon,
  title,
  className,
}: {
  icon: React.ElementType;
  title: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 mb-3", className)}>
      <Icon className="w-4 h-4 text-muted-foreground" />
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
    </div>
  );
}

export function FanBadge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "highlight";
}) {
  return (
    <span
      className={cn(
        "px-2 py-1 text-[10px] font-semibold rounded-lg",
        variant === "highlight"
          ? "bg-fan/15 text-fan border border-fan/25"
          : "bg-muted text-muted-foreground border border-border",
      )}
    >
      {children}
    </span>
  );
}

export function FanEmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center text-center py-12 px-4 bg-muted/30 border border-dashed border-border rounded-2xl"
    >
      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </motion.div>
  );
}
