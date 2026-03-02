"use client";

import { Users, ChevronRight, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { AvatarImage } from "@/components/ui/OptimizedImage";
import type { GuestRsvpType } from "@ear-plug/shared/types";
import { cn } from "@/lib/utils";

interface GuestListCardProps {
  totalCount: number;
  previewGuests: Array<{
    rsvpId: string;
    userId: string;
    name: string;
    avatar?: string;
    rsvpType: GuestRsvpType;
  }>;
  canManage: boolean;
  onOpen: () => void;
}

export function GuestListCard({
  totalCount,
  previewGuests,
  canManage,
  onOpen,
}: GuestListCardProps) {
  const overflowCount = Math.max(0, totalCount - previewGuests.length);

  return (
    <motion.button

      onClick={onOpen}
      className="w-full text-left bg-card border border-border rounded-2xl p-4 hover:border-band/30 transition-colors group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-band/10 border border-band/20 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-band" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Guest List</h2>
            <p className="text-sm text-muted-foreground">
              {totalCount} confirmed
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          {canManage && (
            <span className="text-[10px] font-medium px-2 py-1 bg-band/10 text-band rounded-full">
              Admin
            </span>
          )}
          <ChevronRight className="w-4 h-4 transition-transform" />
        </div>
      </div>

      {/* Preview Avatars */}
      <div className="flex items-center">
        <div className="flex -space-x-2">
          {previewGuests.slice(0, 5).map((guest, index) => (
            <motion.div
              key={guest.rsvpId}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="relative"
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full border-2 overflow-hidden",
                  guest.rsvpType === "attended"
                    ? "border-success bg-success/10"
                    : "border-card bg-muted"
                )}
              >
                <AvatarImage
                  src={guest.avatar}
                  alt={guest.name}
                  fallbackText={guest.name}
                  size={40}
                  className="w-full h-full"
                />
              </div>
              {guest.rsvpType === "attended" && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-card flex items-center justify-center">
                  <Crown className="w-2 h-2 text-white" />
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {overflowCount > 0 && (
          <div className="ml-3 w-10 h-10 rounded-full border-2 border-dashed border-muted-foreground/30 bg-card flex items-center justify-center">
            <span className="text-xs font-semibold text-muted-foreground">
              +{overflowCount > 99 ? "99" : overflowCount}
            </span>
          </div>
        )}

        {previewGuests.length === 0 && (
          <p className="text-sm text-muted-foreground">No guests yet</p>
        )}
      </div>
    </motion.button>
  );
}
