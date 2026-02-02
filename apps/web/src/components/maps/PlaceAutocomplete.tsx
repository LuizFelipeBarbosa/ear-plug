"use client";

/// <reference types="google.maps" />

import { useEffect, useRef, useState, useCallback } from "react";
import usePlacesAutocomplete from "use-places-autocomplete";
import { MapPin, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VenueLocationData } from "@/types";

// Re-export for consumers who import from this module
export type { VenueLocationData };

interface PlaceAutocompleteProps {
  value?: VenueLocationData | null;
  onChange: (venue: VenueLocationData | null) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  error?: string;
}

/**
 * Google Maps Places Autocomplete Component
 * 
 * Uses the use-places-autocomplete library to provide a searchable
 * dropdown of venues with automatic extraction of:
 * - Venue Name
 * - Full Address
 * - City
 * - Coordinates (lat/lng)
 * - Place ID
 */
export function PlaceAutocomplete({
  value,
  onChange,
  placeholder = "Enter an address...",
  disabled = false,
  required = false,
  label = "Location",
  error,
}: PlaceAutocompleteProps) {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isScriptError, setIsScriptError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Check if Google Maps script is loaded
  useEffect(() => {
    const checkScript = () => {
      if (window.google?.maps?.places) {
        setIsScriptLoaded(true);
      } else {
        // Retry after a short delay
        setTimeout(checkScript, 100);
      }
    };

    // Check if API key is available
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setIsScriptError(true);
      return;
    }

    // Check if script already exists
    const existingScript = document.querySelector(
      `script[src*="maps.googleapis.com/maps/api/js"]`
    );

    if (existingScript) {
      checkScript();
    } else {
      // Load the script
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => setIsScriptLoaded(true);
      script.onerror = () => setIsScriptError(true);
      document.head.appendChild(script);
    }
  }, []);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initialize usePlacesAutocomplete
  // We don't set requestOptions with LatLng until google is loaded
  const autocompleteHook = usePlacesAutocomplete({
    debounce: 200,
  });

  const {
    ready,
    value: inputValue,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = autocompleteHook;

  // Sync external value with input
  useEffect(() => {
    if (value) {
      setValue(value.name, false);
    } else {
      setValue("", false);
    }
  }, [value, setValue]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    // Show suggestions when user has typed 2+ characters
    if (newValue.length >= 2) {
      setShowSuggestions(true);
    }
    // Clear selection if user modifies the text after selection
    if (value && newValue !== value.name) {
      onChange(null);
    }
  };

  // Clear selection
  const handleClear = () => {
    setValue("", false);
    onChange(null);
    clearSuggestions();
    inputRef.current?.focus();
  };

  // Extract city from address components
  const extractCity = (addressComponents: google.maps.GeocoderAddressComponent[]): string => {
    const cityComponent =
      addressComponents.find((comp) =>
        comp.types.includes("locality")
      ) ||
      addressComponents.find((comp) =>
        comp.types.includes("sublocality")
      ) ||
      addressComponents.find((comp) =>
        comp.types.includes("administrative_area_level_2")
      );
    return cityComponent?.long_name || "";
  };

  // Handle place selection
  const handleSelect = useCallback(
    async (suggestion: google.maps.places.AutocompletePrediction) => {
      setValue(suggestion.description, false);
      setShowSuggestions(false);
      clearSuggestions();

      // Guard against google not being loaded
      if (typeof window === "undefined" || !window.google?.maps?.places) {
        console.error("Google Maps not loaded");
        return;
      }

      try {
        const placesService = new window.google.maps.places.PlacesService(
          document.createElement("div")
        );

        placesService.getDetails(
          {
            placeId: suggestion.place_id,
            fields: [
              "name",
              "formatted_address",
              "geometry",
              "place_id",
              "formatted_phone_number",
              "website",
              "address_components",
            ],
          },
          (place, status) => {
            if (
              status === window.google.maps.places.PlacesServiceStatus.OK &&
              place &&
              place.geometry &&
              place.geometry.location
            ) {
              const city = place.address_components
                ? extractCity(place.address_components)
                : "";

              // Determine name: use place name for establishments, 
              // otherwise use the street address or first term
              let name = place.name || "";
              if (!name || name === place.formatted_address) {
                // For addresses without a specific venue name
                const streetNumber = place.address_components?.find(c =>
                  c.types.includes("street_number")
                )?.long_name;
                const route = place.address_components?.find(c =>
                  c.types.includes("route")
                )?.long_name;
                name = streetNumber && route
                  ? `${streetNumber} ${route}`
                  : suggestion.terms[0]?.value || "Location";
              }

              const venueData: VenueLocationData = {
                name,
                address: place.formatted_address || suggestion.description,
                city,
                coordinates: {
                  lat: place.geometry.location.lat(),
                  lng: place.geometry.location.lng(),
                },
                placeId: suggestion.place_id,
                phoneNumber: place.formatted_phone_number,
                website: place.website,
              };

              onChange(venueData);
            }
          }
        );
      } catch (err) {
        console.error("Error fetching place details:", err);
      }
    },
    [clearSuggestions, onChange, setValue]
  );

  // Render loading state
  if (!isScriptLoaded) {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
            {label}
            {required && <span className="text-lime ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
          </div>
          <input
            type="text"
            disabled
            placeholder="Loading Google Maps..."
            className="w-full pl-12 pr-4 py-3.5 bg-night-tertiary border-2 border-zinc-800 rounded-none text-zinc-500 placeholder:text-zinc-600 focus:outline-none"
          />
        </div>
      </div>
    );
  }

  // Render error state
  if (isScriptError) {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
            {label}
            {required && <span className="text-lime ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <MapPin className="w-5 h-5 text-red-500" />
          </div>
          <input
            type="text"
            disabled
            placeholder="Google Maps API key required"
            className="w-full pl-12 pr-4 py-3.5 bg-night-tertiary border-2 border-red-900/50 rounded-none text-zinc-500"
          />
        </div>
        <p className="text-xs text-red-500 mt-1.5">
          Please configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your environment.
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full relative">
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
          {label}
          {required && <span className="text-lime ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {/* Map Pin Icon */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <MapPin
            className={cn(
              "w-5 h-5 transition-colors",
              value ? "text-lime" : "text-zinc-600"
            )}
          />
        </div>

        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(true)}
          disabled={disabled || !ready}
          placeholder={placeholder}
          className={cn(
            "w-full pl-12 pr-10 py-3.5 bg-night-tertiary border-2 rounded-none text-white placeholder:text-zinc-600 focus:outline-none transition-colors",
            error
              ? "border-red-500 focus:border-red-400"
              : "border-zinc-800 focus:border-lime",
            value && "border-lime/30"
          )}
        />

        {/* Clear Button */}
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 flex items-center justify-center hover:bg-zinc-800 rounded-full transition-colors"
            tabIndex={-1}
          >
            <X className="w-4 h-4 text-zinc-500" />
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-xs text-red-500 mt-1.5 font-medium">{error}</p>
      )}

      {/* Selected Venue Info */}
      {value && (
        <div className="mt-3 p-3 bg-lime/5 border border-lime/20">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-lime mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {value.name}
              </p>
              <p className="text-xs text-zinc-500 truncate">{value.address}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] bg-night-tertiary text-zinc-400 px-2 py-0.5 uppercase tracking-wider">
                  {value.city}
                </span>
                <span className="text-[10px] text-zinc-600">
                  {value.coordinates.lat.toFixed(4)}, {value.coordinates.lng.toFixed(4)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && inputValue.length >= 2 && status === "OK" && data.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-night-secondary border-2 border-zinc-800 shadow-xl max-h-64 overflow-y-auto">
          {data.map((suggestion, index) => (
            <button
              key={suggestion.place_id}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className="w-full px-4 py-3 text-left hover:bg-night-tertiary hover:border-lime/30 transition-colors border-b border-zinc-800/50 last:border-0 group"
            >
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0 group-hover:text-lime transition-colors" />
                <div className="min-w-0">
                  <p className="text-sm text-white font-medium truncate group-hover:text-lime transition-colors">
                    {suggestion.structured_formatting.main_text}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">
                    {suggestion.structured_formatting.secondary_text}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Loading State */}
      {showSuggestions && inputValue.length >= 2 && status === "ZERO_RESULTS" && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-night-secondary border-2 border-zinc-800 shadow-xl p-4 text-center">
          <p className="text-sm text-zinc-500">No addresses found</p>
        </div>
      )}

      {/* Typing hint */}
      {showSuggestions && inputValue.length === 1 && !value && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-night-secondary border-2 border-zinc-800 shadow-xl p-3 text-center">
          <p className="text-xs text-zinc-500">Keep typing to see suggestions...</p>
        </div>
      )}
    </div>
  );
}
