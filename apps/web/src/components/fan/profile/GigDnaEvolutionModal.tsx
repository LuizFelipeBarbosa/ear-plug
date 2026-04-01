"use client";

import { useMemo } from "react";
import { Check, ChevronRight, Lock, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  deriveGigDnaEvolution,
  type GigDnaTier,
} from "@/lib/gigDnaEvolution";
import { ResponsiveSheetModal } from "@/components/ui/ResponsiveSheetModal";

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

  return (
    <ResponsiveSheetModal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="gig-dna-evolution-title"
      panelClassName="sm:max-w-xl"
    >
      <div className="border-b border-border bg-card/95 px-4 py-4 backdrop-blur-xl sm:px-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-fan/20 bg-fan/10">
              <Sparkles className="w-5 h-5 text-fan" />
            </div>
            <div className="min-w-0">
              <h2
                id="gig-dna-evolution-title"
                className="text-base font-bold text-foreground sm:text-lg"
              >
                Gig DNA Evolution
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Complete checkpoints to reach your next tier
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="touch-target shrink-0 rounded-xl border border-border bg-muted p-2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Close Gig DNA evolution modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-24 pt-4 sm:px-5 sm:pb-8">
        <div className="space-y-5">
          {!gigDna || !evolution ? (
            <div className="rounded-2xl border border-border bg-muted/30 p-5 text-sm text-muted-foreground">
              Gig DNA data is unavailable right now.
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-fan/20 bg-gradient-to-br from-fan/10 via-fan/5 to-transparent p-4">
                <p className="mb-1 text-xs   text-muted-foreground">
                  Current DNA
                </p>
                <p className="text-xl font-bold text-foreground">{gigDna.label}</p>
                <div className="mt-3 inline-flex items-center gap-1 rounded-lg border border-fan/20 bg-fan/10 px-2 py-1 text-[11px] font-semibold text-fan">
                  Tier {evolution.currentTier}
                </div>
              </div>

              {evolution.isMaxTier ? (
                <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
                  <p className="text-sm font-semibold text-foreground">
                    You are at the max tier
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Headliner unlocked with {formatShowsLabel(gigDna.attendedShows)} attended.
                  </p>
                </div>
              ) : (
                <>
                  <section className="space-y-3 rounded-2xl border border-border bg-muted/30 p-4">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="text-xs   text-muted-foreground">
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
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-fan transition-[width] duration-300 ease-out"
                        style={{ width: `${evolution.progressPercent}%` }}
                      />
                    </div>
                  </section>

                  <section className="space-y-2">
                    <p className="text-xs font-semibold   text-muted-foreground">
                      Checkpoints
                    </p>
                    {evolution.checkpoints.map((checkpoint) => (
                      <div
                        key={checkpoint.requiredShows}
                        className={cn(
                          "flex flex-col gap-3 rounded-xl border px-3 py-3 sm:flex-row sm:items-center sm:justify-between",
                          checkpoint.status === "completed" &&
                            "border-emerald-500/25 bg-emerald-500/10",
                          checkpoint.status === "current" && "border-fan/25 bg-fan/10",
                          checkpoint.status === "locked" && "border-border bg-card",
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border",
                              checkpoint.status === "completed" &&
                                "border-emerald-500/40 bg-emerald-500/20 text-emerald-600",
                              checkpoint.status === "current" &&
                                "border-fan/40 bg-fan/20 text-fan",
                              checkpoint.status === "locked" &&
                                "border-border bg-muted text-muted-foreground",
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
                          <p className="truncate text-sm font-medium text-foreground">
                            Attend {formatShowsLabel(checkpoint.requiredShows)}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "w-fit whitespace-nowrap rounded-lg border px-2 py-1 text-[11px] font-semibold",
                            checkpoint.status === "completed" &&
                              "border-emerald-500/35 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
                            checkpoint.status === "current" &&
                              "border-fan/35 bg-fan/15 text-fan",
                            checkpoint.status === "locked" &&
                              "border-border bg-muted text-muted-foreground",
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
      </div>
    </ResponsiveSheetModal>
  );
}
