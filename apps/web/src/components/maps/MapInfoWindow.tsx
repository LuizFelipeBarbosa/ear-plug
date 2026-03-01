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
      {/* InfoWindow Container - no overflow-hidden so button can overflow */}
      <div className="relative bg-card border border-fan shadow-soft animate-slide-up rounded-lg">
        {/* Close Button - positioned outside the container */}
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 z-10 w-6 h-6 bg-card border border-fan text-fan hover:bg-fan hover:text-foreground flex items-center justify-center transition-colors rounded-full shadow-soft"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
        
        {/* Content */}
        <div>
          {children}
        </div>
        
        {/* Arrow/Tail */}
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-[7px] w-3 h-3 bg-card border-r border-b border-fan rotate-45" />
      </div>
    </div>,
    containerRef.current
  );
}
