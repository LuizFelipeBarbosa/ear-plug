"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { fadeFast, presenceSyncNoInitial } from "@/lib/motion/presets";

export interface ResponsiveSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  closeDisabled?: boolean;
  panelClassName?: string;
  backdropClassName?: string;
  labelledBy?: string;
}

export function ResponsiveSheetModal({
  isOpen,
  onClose,
  children,
  closeDisabled = false,
  panelClassName,
  backdropClassName,
  labelledBy,
}: ResponsiveSheetModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarOffset =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarOffset > 0) {
      document.body.style.paddingRight = `${scrollbarOffset}px`;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !closeDisabled) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeDisabled, isOpen, onClose]);

  return (
    <AnimatePresence {...presenceSyncNoInitial}>
      {isOpen ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fadeFast}
            className={cn(
              "absolute inset-0 bg-black/70 backdrop-blur-sm",
              backdropClassName,
            )}
            onClick={closeDisabled ? undefined : onClose}
            aria-label="Close dialog"
          />

          <motion.div
            initial={{ y: "8%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "8%", opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            onClick={(event) => event.stopPropagation()}
            className={cn(
              "relative flex w-full max-h-[100dvh] flex-col overflow-hidden overscroll-contain bg-card shadow-2xl",
              "rounded-t-[1.75rem] border border-border sm:max-h-[90vh] sm:rounded-3xl",
              "sm:max-w-lg",
              panelClassName,
            )}
          >
            {children}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
