"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2,
  HelpCircle,
  Clock,
  Sparkles,
  CalendarCheck,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GigModalShell } from "@/components/band/GigModalShell";
import { GigModalHeader } from "@/components/band/GigFormShared";

interface CreateGigTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (kind: "tentative" | "confirmed") => void;
}

const STATUS_COLORS = {
  confirmed: {
    bg: "bg-emerald-500",
    bgLight: "bg-emerald-500/10",
    bgHover: "hover:bg-emerald-500/20",
    border: "border-emerald-500/40",
    borderStrong: "border-emerald-500",
    text: "text-emerald-500",
    textDark: "text-emerald-600",
    ring: "ring-emerald-500/30",
    shadow: "shadow-emerald-500/20",
  },
  tentative: {
    bg: "bg-amber-500",
    bgLight: "bg-amber-500/10",
    bgHover: "hover:bg-amber-500/20",
    border: "border-amber-500/40",
    borderStrong: "border-amber-500",
    text: "text-amber-500",
    textDark: "text-amber-600",
    ring: "ring-amber-500/30",
    shadow: "shadow-amber-500/20",
  },
};

export function CreateGigTypeModal({
  isOpen,
  onClose,
  onSelect,
}: CreateGigTypeModalProps) {
  return (
    <GigModalShell
      isOpen={isOpen}
      onClose={onClose}
      panelClassName="sm:max-w-md"
      labelledBy="create-gig-type-modal-title"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="relative bg-gradient-to-br from-muted/50 to-muted">
          <div className="absolute top-0 right-0 h-32 w-32 translate-x-1/3 -translate-y-1/2 rounded-full bg-band/5 blur-3xl" />
          <div className="relative">
            <GigModalHeader
              labelledBy="create-gig-type-modal-title"
              title="Create a Show"
              description="Choose how you want to start."
              icon={Sparkles}
              onClose={onClose}
              tone="neutral"
              eyebrow="New Gig"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-4 sm:px-6 sm:pt-6">
          <div className="space-y-4">
            <motion.button
              type="button"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              onClick={() => onSelect("tentative")}
              className={cn(
                "group relative w-full overflow-hidden rounded-2xl border-2 bg-card p-4 text-left transition-colors transition-shadow hover:shadow-lg sm:p-5",
                STATUS_COLORS.tentative.border,
                STATUS_COLORS.tentative.bgHover,
                "hover:border-amber-500/60",
              )}
            >
              <div
                className={cn(
                  "absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100",
                  STATUS_COLORS.tentative.bgLight,
                )}
              />

              <div className="relative flex items-start gap-3 sm:gap-4">
                <div
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 transition-colors sm:h-14 sm:w-14",
                    STATUS_COLORS.tentative.bgLight,
                    STATUS_COLORS.tentative.border,
                  )}
                >
                  <CalendarClock
                    className={cn("w-6 h-6 sm:w-7 sm:h-7", STATUS_COLORS.tentative.text)}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-foreground">Tentative Gig</h3>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                        STATUS_COLORS.tentative.bgLight,
                        STATUS_COLORS.tentative.text,
                        STATUS_COLORS.tentative.border,
                      )}
                    >
                      Draft
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Start with a placeholder. Perfect for holds, potential dates, or
                    ideas you&apos;re not ready to announce.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      Private
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <HelpCircle className="w-3.5 h-3.5" />
                      Flexible
                    </span>
                  </div>
                </div>
              </div>
            </motion.button>

            <motion.button
              type="button"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              onClick={() => onSelect("confirmed")}
              className={cn(
                "group relative w-full overflow-hidden rounded-2xl border-2 bg-card p-4 text-left transition-colors transition-shadow hover:shadow-lg sm:p-5",
                STATUS_COLORS.confirmed.border,
                STATUS_COLORS.confirmed.bgHover,
                "hover:border-emerald-500/60",
              )}
            >
              <div
                className={cn(
                  "absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100",
                  STATUS_COLORS.confirmed.bgLight,
                )}
              />

              <div className="relative flex items-start gap-3 sm:gap-4">
                <div
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 transition-colors sm:h-14 sm:w-14",
                    STATUS_COLORS.confirmed.bgLight,
                    STATUS_COLORS.confirmed.border,
                  )}
                >
                  <CalendarCheck
                    className={cn("w-6 h-6 sm:w-7 sm:h-7", STATUS_COLORS.confirmed.text)}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-foreground">Confirmed Gig</h3>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                        STATUS_COLORS.confirmed.bgLight,
                        STATUS_COLORS.confirmed.text,
                        STATUS_COLORS.confirmed.border,
                      )}
                    >
                      Published
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Book it. Add the details, make it visible to fans, and publish it
                    when it&apos;s ready to promote.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Public
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Sparkles className="w-3.5 h-3.5" />
                      Ready to share
                    </span>
                  </div>
                </div>
              </div>
            </motion.button>

            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-center text-xs text-muted-foreground">
                You can always change a tentative gig to confirmed later.
              </p>
            </div>
          </div>
        </div>
      </div>
    </GigModalShell>
  );
}
