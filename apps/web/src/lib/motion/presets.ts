import type { Transition, Variants } from "framer-motion";

export const MOTION_EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

export const motionConfigTransition: Transition = {
  duration: 0.16,
  ease: MOTION_EASE,
};

export const fadeFast: Transition = {
  duration: 0.12,
  ease: MOTION_EASE,
};

export const fadeInOut: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: fadeFast },
  exit: { opacity: 0, transition: fadeFast },
};

export const panelFade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: motionConfigTransition },
  exit: { opacity: 0, transition: motionConfigTransition },
};

export const listStaggerLight: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.02,
      delayChildren: 0.02,
    },
  },
};

export const presenceSyncNoInitial = {
  mode: "sync" as const,
  initial: false as const,
};
