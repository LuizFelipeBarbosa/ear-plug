export type GigDnaTier = "Rookie" | "Rising" | "Regular" | "Headliner";

export interface GigDnaCheckpoint {
  requiredShows: number;
  completed: boolean;
  isCurrent: boolean;
  status: "completed" | "current" | "locked";
}

export interface GigDnaEvolutionState {
  currentTier: GigDnaTier;
  nextTier: GigDnaTier | null;
  targetShows: number | null;
  remainingShows: number;
  progressPercent: number;
  checkpoints: GigDnaCheckpoint[];
  isMaxTier: boolean;
}

const GIG_DNA_TIER_ORDER: readonly GigDnaTier[] = [
  "Rookie",
  "Rising",
  "Regular",
  "Headliner",
];

const GIG_DNA_TIER_META: Record<
  GigDnaTier,
  {
    minShows: number;
    targetShows: number | null;
    checkpoints: readonly number[];
  }
> = {
  Rookie: {
    minShows: 0,
    targetShows: 3,
    checkpoints: [1, 2, 3],
  },
  Rising: {
    minShows: 3,
    targetShows: 10,
    checkpoints: [4, 6, 8, 10],
  },
  Regular: {
    minShows: 10,
    targetShows: 20,
    checkpoints: [12, 15, 18, 20],
  },
  Headliner: {
    minShows: 20,
    targetShows: null,
    checkpoints: [],
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeShows(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
}

export function deriveGigDnaEvolution(args: {
  tier: GigDnaTier;
  attendedShows: number;
}): GigDnaEvolutionState {
  const attendedShows = normalizeShows(args.attendedShows);
  const currentTier = args.tier;
  const tierMeta = GIG_DNA_TIER_META[currentTier];
  const currentTierIndex = GIG_DNA_TIER_ORDER.indexOf(currentTier);
  const nextTier =
    currentTierIndex >= 0 && currentTierIndex < GIG_DNA_TIER_ORDER.length - 1
      ? GIG_DNA_TIER_ORDER[currentTierIndex + 1]
      : null;

  const targetShows = tierMeta.targetShows;
  const isMaxTier = targetShows === null;
  const remainingShows = isMaxTier ? 0 : Math.max(0, targetShows - attendedShows);
  const progressPercent = isMaxTier
    ? 100
    : clamp((attendedShows / targetShows) * 100, 0, 100);

  const firstIncompleteIndex = tierMeta.checkpoints.findIndex(
    (requiredShows) => attendedShows < requiredShows
  );
  const currentCheckpointIndex =
    firstIncompleteIndex >= 0
      ? firstIncompleteIndex
      : tierMeta.checkpoints.length > 0
        ? tierMeta.checkpoints.length - 1
        : -1;

  const checkpoints: GigDnaCheckpoint[] = tierMeta.checkpoints.map(
    (requiredShows, index) => {
      const completed = attendedShows >= requiredShows;
      const isCurrent = index === currentCheckpointIndex;

      return {
        requiredShows,
        completed,
        isCurrent,
        status: completed ? "completed" : isCurrent ? "current" : "locked",
      };
    }
  );

  return {
    currentTier,
    nextTier,
    targetShows,
    remainingShows,
    progressPercent,
    checkpoints,
    isMaxTier,
  };
}
