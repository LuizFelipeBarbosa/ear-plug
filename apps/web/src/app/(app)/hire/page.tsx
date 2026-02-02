"use client";

import { useState } from "react";
import { useBandListingSearch } from "@/hooks/useBandListing";
import { useCurrentUser } from "@/hooks/useUser";
import { cn } from "@/lib/utils";
import {
  Search,
  Filter,
  MapPin,
  Music,
  DollarSign,
  Star,
  ChevronRight,
  X,
} from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@ear-plug/shared";
import { EVENT_TYPES, GENRES, GENRE_COLORS } from "@ear-plug/shared";
import type { MarketplaceEventType, Genre } from "@ear-plug/shared";

export default function HireMarketplacePage() {
  const { user, isFan, isLoading: userLoading } = useCurrentUser();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<{
    eventType?: MarketplaceEventType;
    genre?: Genre;
    location?: string;
    minPrice?: number;
    maxPrice?: number;
  }>({});

  const { listings, isLoading: listingsLoading } = useBandListingSearch(filters);

  const isLoading = userLoading || listingsLoading;

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== undefined);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-night">
        <div className="animate-pulse">
          <div className="w-12 h-12 bg-lime animate-pulse-lime" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-night pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-night/95 backdrop-blur-lg border-b border-lime/10">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-display text-white">Hire a Band</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Find the perfect band for your event
          </p>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-4 flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by location..."
              value={filters.location ?? ""}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  location: e.target.value || undefined,
                }))
              }
              className="w-full pl-10 pr-4 py-2 bg-night-secondary border border-lime/10 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-lime/30"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "px-4 py-2 rounded-lg border transition-colors flex items-center gap-2",
              showFilters || hasActiveFilters
                ? "bg-lime text-night border-lime"
                : "bg-night-secondary text-zinc-400 border-lime/10 hover:border-lime/30"
            )}
          >
            <Filter className="w-5 h-5" />
            {hasActiveFilters && (
              <span className="text-xs">
                {Object.values(filters).filter((v) => v !== undefined).length}
              </span>
            )}
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="px-4 pb-4 space-y-4 border-t border-lime/10 pt-4">
            {/* Event Type */}
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Event Type</label>
              <div className="flex flex-wrap gap-2">
                {EVENT_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() =>
                      setFilters((f) => ({
                        ...f,
                        eventType: f.eventType === type.value ? undefined : type.value,
                      }))
                    }
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm transition-colors",
                      filters.eventType === type.value
                        ? "bg-lime text-night"
                        : "bg-night-secondary text-zinc-400 hover:text-white"
                    )}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Genre */}
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Genre</label>
              <div className="flex flex-wrap gap-2">
                {GENRES.map((genre) => (
                  <button
                    key={genre.value}
                    onClick={() =>
                      setFilters((f) => ({
                        ...f,
                        genre: f.genre === genre.value ? undefined : genre.value,
                      }))
                    }
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm transition-colors",
                      filters.genre === genre.value
                        ? "text-night"
                        : "bg-night-secondary text-zinc-400 hover:text-white"
                    )}
                    style={{
                      backgroundColor:
                        filters.genre === genre.value
                          ? GENRE_COLORS[genre.value]
                          : undefined,
                    }}
                  >
                    {genre.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">
                Price Range (per hour)
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice ? filters.minPrice / 100 : ""}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      minPrice: e.target.value
                        ? Number(e.target.value) * 100
                        : undefined,
                    }))
                  }
                  className="w-24 px-3 py-2 bg-night-secondary border border-lime/10 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-lime/30"
                />
                <span className="text-zinc-500">to</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice ? filters.maxPrice / 100 : ""}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      maxPrice: e.target.value
                        ? Number(e.target.value) * 100
                        : undefined,
                    }))
                  }
                  className="w-24 px-3 py-2 bg-night-secondary border border-lime/10 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-lime/30"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-lime hover:text-lime/80 flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="p-4">
        {listings.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-night-secondary flex items-center justify-center">
              <Music className="w-8 h-8 text-zinc-500" />
            </div>
            <p className="text-zinc-400">
              {hasActiveFilters
                ? "No bands found matching your filters"
                : "No bands available for hire yet"}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 text-lime hover:text-lime/80"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-zinc-500">
              {listings.length} band{listings.length !== 1 ? "s" : ""} available
            </p>
            {listings.map((listing) => (
              <BandHireCard key={listing._id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface BandHireCardProps {
  listing: {
    _id: string;
    title: string;
    baseHourlyRate: number;
    minimumHours: number;
    eventTypes: MarketplaceEventType[];
    band: {
      _id: string;
      name: string;
      genres?: Genre[];
      location: string;
      image?: string;
      bio?: string;
    };
  };
}

function BandHireCard({ listing }: BandHireCardProps) {
  const { band } = listing;

  return (
    <Link
      href={`/hire/${band._id}`}
      className="block bg-night-secondary rounded-xl overflow-hidden border border-lime/10 hover:border-lime/30 transition-colors"
    >
      {/* Band Image */}
      <div className="relative h-40 bg-night">
        {band.image ? (
          <img
            src={band.image}
            alt={band.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="w-16 h-16 text-zinc-700" />
          </div>
        )}
        {/* Price Badge */}
        <div className="absolute top-3 right-3 px-3 py-1 bg-night/80 backdrop-blur-sm rounded-full">
          <span className="text-lime font-medium">
            {formatPrice(listing.baseHourlyRate)}/hr
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-lg font-medium text-white">{band.name}</h3>
            <div className="flex items-center gap-1 text-sm text-zinc-400">
              <MapPin className="w-4 h-4" />
              <span>{band.location}</span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-zinc-500" />
        </div>

        {/* Genres */}
        {band.genres && band.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {band.genres.slice(0, 3).map((genre) => (
              <span
                key={genre}
                className="px-2 py-0.5 rounded-full text-xs font-medium text-night"
                style={{ backgroundColor: GENRE_COLORS[genre] }}
              >
                {genre.charAt(0).toUpperCase() + genre.slice(1)}
              </span>
            ))}
          </div>
        )}

        {/* Bio Preview */}
        {band.bio && (
          <p className="text-sm text-zinc-400 line-clamp-2 mb-3">{band.bio}</p>
        )}

        {/* Event Types */}
        <div className="flex flex-wrap gap-1">
          {listing.eventTypes.slice(0, 3).map((type) => {
            const eventType = EVENT_TYPES.find((t) => t.value === type);
            return (
              <span
                key={type}
                className="px-2 py-0.5 rounded text-xs bg-night text-zinc-400"
              >
                {eventType?.label || type}
              </span>
            );
          })}
          {listing.eventTypes.length > 3 && (
            <span className="px-2 py-0.5 rounded text-xs bg-night text-zinc-500">
              +{listing.eventTypes.length - 3} more
            </span>
          )}
        </div>

        {/* Min Hours */}
        <p className="mt-3 text-xs text-zinc-500">
          Min {listing.minimumHours} hours
        </p>
      </div>
    </Link>
  );
}
