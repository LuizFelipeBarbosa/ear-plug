"use client";

import { useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, Lock, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  deriveGigDnaEvolution,
  type GigDnaTier,
} from "@/lib/gigDnaEvolution";
import { fadeFast, panelFade, presenceSyncNoInitial } from "@/lib/motion/presets";

interface GigDnaSnapshot {
  label: string;
  tier: GigDnaTier;
  attendedShows: number;
}

interface GigDnaEvolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  gigDna?: GigDnaSnapshot | null;
}

function checkpointStatusLabel(status: "completed" | "current" | "locked"): string {
  if (status === "completed") return "Completed";
  if (status === "current") return "Up next";
  return "Locked";
}

function formatShowsLabel(value: number): string {
  return `${value} ${value === 1 ? "show" : "shows"}`;
}

export function GigDnaEvolutionModal({
  isOpen,
  onClose,
  gigDna,
}: GigDnaEvolutionModalProps) {
  const evolution = useMemo(() => {
    if (!gigDna) {
      return null;
    }
    return deriveGigDnaEvolution({
      tier: gigDna.tier,
      attendedShows: gigDna.attendedShows,
    });
  }, [gigDna]);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence {...presenceSyncNoInitial}>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <motion.button
            type="button"
            aria-label="Close Gig DNA evolution modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fadeFast}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="gig-dna-evolution-title"
            variants={panelFade}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-xl mx-4 bg-card border border-border rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-hidden shadow-2xl"
          >
            <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-xl border-b border-border px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-fan/10 border border-fan/20 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-fan" />
                </div>
                <div>
                  <h2 id="gig-dna-evolution-title" className="text-lg font-bold text-foreground">
                    Gig DNA Evolution
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Complete checkpoints to reach your next tier
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2.5 hover:bg-muted border border-border hover:border-fan/30 rounded-xl transition-colors touch-target"
                aria-label="Close Gig DNA evolution modal"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(90vh-80px)]">
              {!gigDna || !evolution ? (
                <div className="rounded-2xl border border-border bg-muted/30 p-5 text-sm text-muted-foreground">
                  Gig DNA data is unavailable right now.
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-fan/20 bg-gradient-to-br from-fan/10 via-fan/5 to-transparent p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Current DNA
                    </p>
                    <p className="text-xl font-bold text-foreground">{gigDna.label}</p>
                    <div className="mt-3 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-fan/10 border border-fan/20 text-[11px] font-semibold text-fan">
                      Tier {evolution.currentTier}
                    </div>
                  </div>

                  {evolution.isMaxTier ? (
                    <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
                      <p className="text-sm font-semibold text-foreground">
                        You are at the max tier
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Headliner unlocked with {formatShowsLabel(gigDna.attendedShows)} attended.
                      </p>
                    </div>
                  ) : (
                    <>
                      <section className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">
                              Progress to {evolution.nextTier}
                            </p>
                            <p className="text-lg font-bold text-foreground">
                              {gigDna.attendedShows} / {evolution.targetShows} shows
                            </p>
                          </div>
                          <p className="text-xs font-medium text-muted-foreground">
                            {evolution.remainingShows} remaining
                          </p>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-fan transition-[width] duration-300 ease-out"
                            style={{ width: `${evolution.progressPercent}%` }}
                          />
                        </div>
                      </section>

                      <section className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Checkpoints
                        </p>
                        {evolution.checkpoints.map((checkpoint) => (
                          <div
                            key={checkpoint.requiredShows}
                            className={cn(
                              "flex items-center justify-between gap-3 rounded-xl border px-3 py-3",
                              checkpoint.status === "completed" && "border-emerald-500/25 bg-emerald-500/10",
                              checkpoint.status === "current" && "border-fan/25 bg-fan/10",
                              checkpoint.status === "locked" && "border-border bg-card"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={cn(
                                  "inline-flex items-center justify-center w-7 h-7 rounded-full border flex-shrink-0",
                                  checkpoint.status === "completed" &&
                                    "border-emerald-500/40 bg-emerald-500/20 text-emerald-600",
                                  checkpoint.status === "current" &&
                                    "border-fan/40 bg-fan/20 text-fan",
                                  checkpoint.status === "locked" &&
                                    "border-border bg-muted text-muted-foreground"
                                )}
                              >
                                {checkpoint.status === "completed" ? (
                                  <Check className="w-4 h-4" />
                                ) : checkpoint.status === "current" ? (
                                  <ChevronRight className="w-4 h-4" />
                                ) : (
                                  <Lock className="w-3.5 h-3.5" />
                                )}
                              </span>
                              <p className="text-sm font-medium text-foreground truncate">
                                Attend {formatShowsLabel(checkpoint.requiredShows)}
                              </p>
                            </div>
                            <span
                              className={cn(
                                "text-[11px] font-semibold px-2 py-1 rounded-lg border whitespace-nowrap",
                                checkpoint.status === "completed" &&
                                  "border-emerald-500/35 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
                                checkpoint.status === "current" &&
                                  "border-fan/35 bg-fan/15 text-fan",
                                checkpoint.status === "locked" &&
                                  "border-border bg-muted text-muted-foreground"
                              )}
                            >
                              {checkpointStatusLabel(checkpoint.status)}
                            </span>
                          </div>
                        ))}
                      </section>
                    </>
                  )}
                </>
              )}
            </div>
          </motion.section>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
