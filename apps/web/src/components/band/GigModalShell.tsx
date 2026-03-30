"use client";

import {
  ResponsiveSheetModal,
  type ResponsiveSheetModalProps,
} from "@/components/ui/ResponsiveSheetModal";

export type GigModalShellProps = ResponsiveSheetModalProps;

export function GigModalShell({
  isOpen,
  onClose,
  children,
  closeDisabled = false,
  panelClassName,
  backdropClassName,
  labelledBy,
}: GigModalShellProps) {
  return (
    <ResponsiveSheetModal
      isOpen={isOpen}
      onClose={onClose}
      closeDisabled={closeDisabled}
      panelClassName={panelClassName}
      backdropClassName={backdropClassName}
      labelledBy={labelledBy}
    >
      {children}
    </ResponsiveSheetModal>
  );
}
