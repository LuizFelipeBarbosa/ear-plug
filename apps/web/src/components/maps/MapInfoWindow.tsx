"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMap } from "@vis.gl/react-google-maps";
import { X } from "lucide-react";

interface MapInfoWindowProps {
  position: google.maps.LatLngLiteral;
  children: React.ReactNode;
  onClose: () => void;
}

export function MapInfoWindow({ position, children, onClose }: MapInfoWindowProps) {
  const map = useMap();
  const overlayRef = useRef<google.maps.OverlayView | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!map) return;

    // Create custom overlay
    const overlay = new google.maps.OverlayView();
    
    overlay.onAdd = function() {
      const div = document.createElement("div");
      div.style.position = "absolute";
      div.style.pointerEvents = "auto";
      div.style.zIndex = "1000";
      containerRef.current = div;
      
      const panes = this.getPanes();
      if (panes?.floatPane) {
        panes.floatPane.appendChild(div);
        setIsReady(true);
      }
    };

    overlay.onRemove = function() {
      if (containerRef.current) {
        containerRef.current.remove();
        containerRef.current = null;
      }
      setIsReady(false);
    };

    overlay.draw = function() {
      const projection = this.getProjection();
      if (!projection || !containerRef.current) return;
      
      const pos = projection.fromLatLngToDivPixel(new google.maps.LatLng(position));
      if (pos) {
        // Center horizontally, position above marker
        containerRef.current.style.left = `${pos.x}px`;
        containerRef.current.style.top = `${pos.y}px`;
      }
    };

    overlay.setMap(map);
    overlayRef.current = overlay;

    // Handle map clicks to close
    const clickListener = map.addListener("click", () => {
      onClose();
    });

    return () => {
      google.maps.event.removeListener(clickListener);
      overlay.setMap(null);
    };
  }, [map, position, onClose]);

  // Update position when it changes
  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.draw();
    }
  }, [position]);

  if (!isReady || !containerRef.current) return null;

  return createPortal(
    <div 
      className="absolute -translate-x-1/2 -translate-y-full pb-3"
      onClick={(e) => e.stopPropagation()}
    >
      {/* InfoWindow Container - Brutalist Style */}
      <div className="relative bg-night-secondary border-2 border-lime shadow-[4px_4px_0px_rgba(194,255,0,0.3)] animate-slide-up">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 z-10 w-6 h-6 bg-night-tertiary border border-lime text-lime hover:bg-lime hover:text-night flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
        
        {/* Content */}
        <div className="overflow-hidden">
          {children}
        </div>
        
        {/* Arrow/Tail */}
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-[10px] w-4 h-4 bg-night-secondary border-r-2 border-b-2 border-lime rotate-45" />
      </div>
    </div>,
    containerRef.current
  );
}
