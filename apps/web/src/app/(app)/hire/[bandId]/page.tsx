"use client";

import { useState, use } from "react";
import { useBandListingByBand, useAvailableSlots, useCheckAvailability } from "@/hooks/useBandListing";
import { useBookingActions } from "@/hooks/useBookings";
import { useCurrentUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  MapPin,
  Music,
  DollarSign,
  Clock,
  Calendar,
  Users,
  ChevronRight,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { formatPrice, formatEventDate } from "@ear-plug/shared";
import { EVENT_TYPES, GENRES, GENRE_COLORS } from "@ear-plug/shared";
import type { MarketplaceEventType, Genre } from "@ear-plug/shared";
import type { Id } from "../../../../../../../convex/_generated/dataModel";

export default function BandHireDetailPage({
  params,
}: {
  params: Promise<{ bandId: string }>;
}) {
  const { bandId } = use(params);
  const router = useRouter();
  const { user, isFan, isLoading: userLoading } = useCurrentUser();
  const { listing, isLoading: listingLoading } = useBandListingByBand(
    bandId as Id<"bands">
  );
  const { slots } = useAvailableSlots(bandId as Id<"bands">);
  const { create: createBooking } = useBookingActions();

  const [showBookingForm, setShowBookingForm] = useState(false);
  const [formData, setFormData] = useState({
    eventType: "" as MarketplaceEventType | "",
    eventName: "",
    eventDescription: "",
    eventDateTime: "",
    durationHours: 2,
    eventLocation: "",
    eventCity: "",
    guestCount: "",
    selectedAddOns: [] as string[],
    specialRequests: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLoading = userLoading || listingLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-night">
        <div className="animate-pulse">
          <div className="w-12 h-12 bg-lime animate-pulse-lime" />
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-night p-6">
        <Link
          href="/hire"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to marketplace
        </Link>
        <div className="text-center py-12">
          <h1 className="text-2xl font-display text-white mb-2">
            Band Not Available
          </h1>
          <p className="text-zinc-400">
            This band is not currently accepting bookings
          </p>
        </div>
      </div>
    );
  }

  const { band } = listing;

  // Calculate total price
  const calculateTotal = () => {
    let total = listing.baseHourlyRate * formData.durationHours;
    if (listing.addOns) {
      for (const addOnName of formData.selectedAddOns) {
        const addOn = listing.addOns.find((a) => a.name === addOnName);
        if (addOn) {
          total += addOn.priceInCents;
        }
      }
    }
    return total;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listing || !formData.eventType || !formData.eventDateTime) return;

    setIsSubmitting(true);
    try {
      const eventDateTime = new Date(formData.eventDateTime).getTime();

      await createBooking({
        listingId: listing._id as Id<"bandListings">,
        eventType: formData.eventType,
        eventName: formData.eventName,
        eventDescription: formData.eventDescription || undefined,
        eventDateTime,
        durationHours: formData.durationHours,
        eventLocation: formData.eventLocation,
        eventCity: formData.eventCity || undefined,
        guestCount: formData.guestCount ? Number(formData.guestCount) : undefined,
        selectedAddOns: formData.selectedAddOns.length > 0 ? formData.selectedAddOns : undefined,
        specialRequests: formData.specialRequests || undefined,
      });

      router.push("/my-bookings");
    } catch (error) {
      console.error("Failed to create booking:", error);
      alert("Failed to submit booking request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-night pb-24">
      {/* Header Image */}
      <div className="relative h-64 bg-night-secondary">
        {band.image ? (
          <img
            src={band.image}
            alt={band.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="w-24 h-24 text-zinc-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-night via-night/50 to-transparent" />

        {/* Back Button */}
        <Link
          href="/hire"
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-night/80 backdrop-blur-sm flex items-center justify-center text-white hover:bg-night transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
      </div>

      {/* Content */}
      <div className="px-4 -mt-16 relative">
        {/* Band Info */}
        <div className="bg-night-secondary rounded-xl p-4 border border-lime/10 mb-4">
          <h1 className="text-2xl font-display text-white mb-1">{band.name}</h1>
          <div className="flex items-center gap-1 text-zinc-400 mb-3">
            <MapPin className="w-4 h-4" />
            <span>{band.location}</span>
          </div>

          {/* Genres */}
          {band.genres && band.genres.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {band.genres.map((genre: Genre) => (
                <span
                  key={genre}
                  className="px-3 py-1 rounded-full text-sm font-medium text-night"
                  style={{ backgroundColor: GENRE_COLORS[genre] }}
                >
                  {genre.charAt(0).toUpperCase() + genre.slice(1)}
                </span>
              ))}
            </div>
          )}

          {/* Bio */}
          {band.bio && <p className="text-zinc-300">{band.bio}</p>}

          {/* Social Links */}
          {band.socialLinks && (
            <div className="flex gap-3 mt-4 pt-4 border-t border-lime/10">
              {band.socialLinks.spotify && (
                <a
                  href={band.socialLinks.spotify}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-lime"
                >
                  Spotify
                </a>
              )}
              {band.socialLinks.instagram && (
                <a
                  href={band.socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-lime"
                >
                  Instagram
                </a>
              )}
              {band.socialLinks.website && (
                <a
                  href={band.socialLinks.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-lime flex items-center gap-1"
                >
                  Website <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Pricing */}
        <div className="bg-night-secondary rounded-xl p-4 border border-lime/10 mb-4">
          <h2 className="text-lg font-medium text-white mb-4">Pricing</h2>

          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-2xl font-display text-lime">
                {formatPrice(listing.baseHourlyRate)}
                <span className="text-sm text-zinc-400 font-normal">/hour</span>
              </p>
              <p className="text-sm text-zinc-400">
                Minimum {listing.minimumHours} hours
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-zinc-400">Deposit</p>
              <p className="text-white font-medium">{listing.depositPercentage}%</p>
            </div>
          </div>

          {/* Add-ons */}
          {listing.addOns && listing.addOns.length > 0 && (
            <div className="border-t border-lime/10 pt-4">
              <p className="text-sm text-zinc-400 mb-2">Available Add-ons</p>
              <div className="space-y-2">
                {listing.addOns.map((addOn) => (
                  <div
                    key={addOn.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-zinc-300">{addOn.name}</span>
                    <span className="text-lime">{formatPrice(addOn.priceInCents)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Event Types */}
        <div className="bg-night-secondary rounded-xl p-4 border border-lime/10 mb-4">
          <h2 className="text-lg font-medium text-white mb-3">Available For</h2>
          <div className="flex flex-wrap gap-2">
            {listing.eventTypes.map((type) => {
              const eventType = EVENT_TYPES.find((t) => t.value === type);
              return (
                <span
                  key={type}
                  className="px-3 py-1.5 rounded-lg bg-night text-zinc-300 text-sm"
                >
                  {eventType?.label || type}
                </span>
              );
            })}
          </div>
        </div>

        {/* Booking Notes */}
        {listing.bookingNotes && (
          <div className="bg-night-secondary rounded-xl p-4 border border-lime/10 mb-4">
            <h2 className="text-lg font-medium text-white mb-2">Booking Info</h2>
            <p className="text-zinc-400 text-sm">{listing.bookingNotes}</p>
          </div>
        )}

        {/* Cancellation Policy */}
        {listing.cancellationPolicy && (
          <div className="bg-night-secondary rounded-xl p-4 border border-lime/10 mb-4">
            <h2 className="text-lg font-medium text-white mb-2">Cancellation Policy</h2>
            <p className="text-zinc-400 text-sm">{listing.cancellationPolicy}</p>
          </div>
        )}

        {/* Book Button */}
        {isFan && !showBookingForm && (
          <button
            onClick={() => setShowBookingForm(true)}
            className="w-full py-4 bg-lime text-night font-bold text-lg rounded-xl hover:bg-lime/90 transition-colors"
          >
            Request Booking
          </button>
        )}

        {/* Booking Form */}
        {showBookingForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-night-secondary rounded-xl p-4 border border-lime/10 space-y-4"
          >
            <h2 className="text-lg font-medium text-white">Book {band.name}</h2>

            {/* Event Type */}
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">
                Event Type *
              </label>
              <select
                required
                value={formData.eventType}
                onChange={(e) =>
                  setFormData((f) => ({
                    ...f,
                    eventType: e.target.value as MarketplaceEventType,
                  }))
                }
                className="w-full px-3 py-2 bg-night border border-lime/10 rounded-lg text-white focus:outline-none focus:border-lime/30"
              >
                <option value="">Select event type</option>
                {listing.eventTypes.map((type) => {
                  const eventType = EVENT_TYPES.find((t) => t.value === type);
                  return (
                    <option key={type} value={type}>
                      {eventType?.label || type}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Event Name */}
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">
                Event Name *
              </label>
              <input
                type="text"
                required
                value={formData.eventName}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, eventName: e.target.value }))
                }
                placeholder="e.g., Smith Wedding Reception"
                className="w-full px-3 py-2 bg-night border border-lime/10 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-lime/30"
              />
            </div>

            {/* Date/Time */}
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">
                Date & Time *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.eventDateTime}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, eventDateTime: e.target.value }))
                }
                min={new Date().toISOString().slice(0, 16)}
                className="w-full px-3 py-2 bg-night border border-lime/10 rounded-lg text-white focus:outline-none focus:border-lime/30"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">
                Duration (hours) *
              </label>
              <input
                type="number"
                required
                min={listing.minimumHours}
                max={24}
                value={formData.durationHours}
                onChange={(e) =>
                  setFormData((f) => ({
                    ...f,
                    durationHours: Number(e.target.value),
                  }))
                }
                className="w-full px-3 py-2 bg-night border border-lime/10 rounded-lg text-white focus:outline-none focus:border-lime/30"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Minimum {listing.minimumHours} hours
              </p>
            </div>

            {/* Location */}
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">
                Event Location *
              </label>
              <input
                type="text"
                required
                value={formData.eventLocation}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, eventLocation: e.target.value }))
                }
                placeholder="Full address"
                className="w-full px-3 py-2 bg-night border border-lime/10 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-lime/30"
              />
            </div>

            {/* City */}
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">City</label>
              <input
                type="text"
                value={formData.eventCity}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, eventCity: e.target.value }))
                }
                placeholder="City name"
                className="w-full px-3 py-2 bg-night border border-lime/10 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-lime/30"
              />
            </div>

            {/* Guest Count */}
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">
                Expected Guests
              </label>
              <input
                type="number"
                min={1}
                value={formData.guestCount}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, guestCount: e.target.value }))
                }
                placeholder="Number of guests"
                className="w-full px-3 py-2 bg-night border border-lime/10 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-lime/30"
              />
            </div>

            {/* Add-ons */}
            {listing.addOns && listing.addOns.length > 0 && (
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">
                  Add-ons
                </label>
                <div className="space-y-2">
                  {listing.addOns.map((addOn) => (
                    <label
                      key={addOn.name}
                      className="flex items-center justify-between p-3 bg-night rounded-lg cursor-pointer hover:bg-night/50"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={formData.selectedAddOns.includes(addOn.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData((f) => ({
                                ...f,
                                selectedAddOns: [...f.selectedAddOns, addOn.name],
                              }));
                            } else {
                              setFormData((f) => ({
                                ...f,
                                selectedAddOns: f.selectedAddOns.filter(
                                  (n) => n !== addOn.name
                                ),
                              }));
                            }
                          }}
                          className="w-4 h-4 text-lime bg-night border-lime/30 rounded focus:ring-lime"
                        />
                        <div>
                          <p className="text-white">{addOn.name}</p>
                          {addOn.description && (
                            <p className="text-xs text-zinc-500">
                              {addOn.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-lime">
                        +{formatPrice(addOn.priceInCents)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Special Requests */}
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">
                Special Requests
              </label>
              <textarea
                value={formData.specialRequests}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, specialRequests: e.target.value }))
                }
                placeholder="Any special requirements or notes..."
                rows={3}
                className="w-full px-3 py-2 bg-night border border-lime/10 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-lime/30 resize-none"
              />
            </div>

            {/* Price Summary */}
            <div className="border-t border-lime/10 pt-4">
              <div className="flex justify-between mb-2">
                <span className="text-zinc-400">
                  {formatPrice(listing.baseHourlyRate)} x {formData.durationHours}{" "}
                  hours
                </span>
                <span className="text-white">
                  {formatPrice(listing.baseHourlyRate * formData.durationHours)}
                </span>
              </div>
              {formData.selectedAddOns.map((addOnName) => {
                const addOn = listing.addOns?.find((a) => a.name === addOnName);
                if (!addOn) return null;
                return (
                  <div key={addOnName} className="flex justify-between mb-2">
                    <span className="text-zinc-400">{addOnName}</span>
                    <span className="text-white">
                      {formatPrice(addOn.priceInCents)}
                    </span>
                  </div>
                );
              })}
              <div className="flex justify-between font-medium text-lg mt-2 pt-2 border-t border-lime/10">
                <span className="text-white">Total</span>
                <span className="text-lime">{formatPrice(calculateTotal())}</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Deposit due on acceptance: {formatPrice(Math.round(calculateTotal() * listing.depositPercentage / 100))}
              </p>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowBookingForm(false)}
                className="flex-1 py-3 bg-night text-zinc-300 font-medium rounded-lg border border-zinc-700 hover:border-zinc-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.eventType || !formData.eventDateTime}
                className="flex-1 py-3 bg-lime text-night font-medium rounded-lg hover:bg-lime/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
