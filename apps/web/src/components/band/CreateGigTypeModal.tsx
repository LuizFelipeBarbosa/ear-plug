"use client";
import { Check, Clock3, X } from "lucide-react";
interface CreateGigTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (kind: "tentative" | "confirmed") => void;
}
export function CreateGigTypeModal({
  isOpen,
  onClose,
  onSelect,
}: CreateGigTypeModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {" "}
      <button
        type="button"
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close gig type chooser"
      />{" "}
      <div className="relative w-full max-w-md bg-card border-2 border-border shadow-2xl overflow-hidden">
        {" "}
        <div className="flex items-center justify-between p-4 border-b-2 border-border bg-muted">
          {" "}
          <div>
            {" "}
            <h2 className="text-lg font-bold text-foreground">
              {" "}
              Create Gig{" "}
            </h2>{" "}
            <p className="text-xs text-muted-foreground mt-0.5">
              {" "}
              Choose how you want to start this gig{" "}
            </p>{" "}
          </div>{" "}
          <button
            type="button"
            onClick={onClose}
            className="p-2 flex items-center justify-center hover:bg-muted border border-border hover:border-band/30 transition-colors touch-target"
          >
            {" "}
            <X className="w-5 h-5 text-muted-foreground" />{" "}
          </button>{" "}
        </div>{" "}
        <div className="p-4 space-y-3">
          {" "}
          <button
            type="button"
            onClick={() => onSelect("tentative")}
            className="w-full text-left p-4 bg-muted border-2 border-band/30 hover:border-band text-foreground transition-colors"
          >
            {" "}
            <div className="flex items-start gap-3">
              {" "}
              <div className="w-10 h-10 flex items-center justify-center border border-band/40 text-band">
                {" "}
                <Clock3 className="w-5 h-5" />{" "}
              </div>{" "}
              <div>
                {" "}
                <p className="font-bold text-sm">Tentative Gig</p>{" "}
                <p className="text-xs text-muted-foreground mt-1">
                  {" "}
                  Private draft. Save with blank fields and fill in details
                  later.{" "}
                </p>{" "}
              </div>{" "}
            </div>{" "}
          </button>{" "}
          <button
            type="button"
            onClick={() => onSelect("confirmed")}
            className="w-full text-left p-4 bg-muted border-2 border-band/40 hover:border-band text-foreground transition-colors"
          >
            {" "}
            <div className="flex items-start gap-3">
              {" "}
              <div className="w-10 h-10 flex items-center justify-center border border-band/40 text-band">
                {" "}
                <Check className="w-5 h-5" />{" "}
              </div>{" "}
              <div>
                {" "}
                <p className="font-bold text-sm">Confirmed Gig</p>{" "}
                <p className="text-xs text-muted-foreground mt-1">
                  {" "}
                  Publish-ready show. Required details must be completed
                  now.{" "}
                </p>{" "}
              </div>{" "}
            </div>{" "}
          </button>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
