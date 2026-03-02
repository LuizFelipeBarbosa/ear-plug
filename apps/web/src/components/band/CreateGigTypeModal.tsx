"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  HelpCircle,
  Clock,
  X,
  Sparkles,
  CalendarCheck,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-label="Close gig type chooser"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative w-full max-w-md bg-card border border-border shadow-2xl rounded-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="relative px-6 py-5 border-b border-border bg-gradient-to-br from-muted/50 to-muted">
              <div className="absolute top-0 right-0 w-32 h-32 bg-band/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />

              <div className="relative flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-band/10 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-band" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      New Gig
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-foreground">
                    Create a Show
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose how you want to start
                  </p>
                </div>

                <motion.button
                  type="button"

                  onClick={onClose}
                  className="p-2 hover:bg-muted border border-border hover:border-band/30 transition-all rounded-xl"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </motion.button>
              </div>
            </div>

            {/* Options */}
            <div className="p-6 space-y-4">
              {/* Tentative Option */}
              <motion.button
                type="button"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}

                onClick={() => onSelect("tentative")}
                className={cn(
                  "w-full text-left p-5 rounded-2xl border-2 transition-all group relative overflow-hidden",
                  "bg-card hover:shadow-lg",
                  STATUS_COLORS.tentative.border,
                  STATUS_COLORS.tentative.bgHover,
                  "hover:border-amber-500/60",
                )}
              >
                {/* Background gradient on hover */}
                <div
                  className={cn(
                    "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity",
                    STATUS_COLORS.tentative.bgLight,
                  )}
                />

                <div className="relative flex items-start gap-4">
                  <div
                    className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all",
                      STATUS_COLORS.tentative.bgLight,
                      STATUS_COLORS.tentative.border,
                      "border-2",
                    )}
                  >
                    <CalendarClock
                      className={cn(
                        "w-7 h-7",
                        STATUS_COLORS.tentative.text,
                      )}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-foreground">
                        Tentative Gig
                      </h3>
                      <span
                        className={cn(
                          "px-2 py-0.5 text-[10px] font-bold rounded-full",
                          STATUS_COLORS.tentative.bgLight,
                          STATUS_COLORS.tentative.text,
                          STATUS_COLORS.tentative.border,
                          "border",
                        )}
                      >
                        Draft
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Start with a placeholder. Perfect for holds, potential
                      dates, or ideas you're not ready to announce.
                    </p>
                    <div className="flex items-center gap-3 mt-3">
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

              {/* Confirmed Option */}
              <motion.button
                type="button"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}

                onClick={() => onSelect("confirmed")}
                className={cn(
                  "w-full text-left p-5 rounded-2xl border-2 transition-all group relative overflow-hidden",
                  "bg-card hover:shadow-lg",
                  STATUS_COLORS.confirmed.border,
                  STATUS_COLORS.confirmed.bgHover,
                  "hover:border-emerald-500/60",
                )}
              >
                {/* Background gradient on hover */}
                <div
                  className={cn(
                    "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity",
                    STATUS_COLORS.confirmed.bgLight,
                  )}
                />

                <div className="relative flex items-start gap-4">
                  <div
                    className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all",
                      STATUS_COLORS.confirmed.bgLight,
                      STATUS_COLORS.confirmed.border,
                      "border-2",
                    )}
                  >
                    <CalendarCheck
                      className={cn(
                        "w-7 h-7",
                        STATUS_COLORS.confirmed.text,
                      )}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-foreground">
                        Confirmed Gig
                      </h3>
                      <span
                        className={cn(
                          "px-2 py-0.5 text-[10px] font-bold rounded-full",
                          STATUS_COLORS.confirmed.bgLight,
                          STATUS_COLORS.confirmed.text,
                          STATUS_COLORS.confirmed.border,
                          "border",
                        )}
                      >
                        Published
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Book it! Add all the details and make it visible to fans.
                      Ready to promote right away.
                    </p>
                    <div className="flex items-center gap-3 mt-3">
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
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-muted/30 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                You can always change a tentative gig to confirmed later
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
