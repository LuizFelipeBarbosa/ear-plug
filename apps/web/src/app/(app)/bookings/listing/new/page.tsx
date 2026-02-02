"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBandListing } from "@/hooks/useBandListing";
import { useCurrentBand } from "@/hooks/useBand";
import { useCurrentUser } from "@/hooks/useUser";
import { cn } from "@/lib/utils";
import { ArrowLeft, Plus, X, DollarSign } from "lucide-react";
import Link from "next/link";
import { EVENT_TYPES } from "@ear-plug/shared";
import type { MarketplaceEventType } from "@ear-plug/shared";
import type { Id } from "../../../../../../../../convex/_generated/dataModel";

interface AddOn {
  name: string;
  description: string;
  priceInCents: number;
}

export default function NewListingPage() {
  const router = useRouter();
  const { user, isMusician, isLoading: userLoading } = useCurrentUser();
  const { band, isLoading: bandLoading } = useCurrentBand();
  const { createListing } = useBandListing();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    eventTypes: [] as MarketplaceEventType[],
    baseHourlyRate: "",
    minimumHours: "2",
    depositPercentage: "25",
    maxTravelDistance: "",
    bookingNotes: "",
    cancellationPolicy: "",
  });
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [newAddOn, setNewAddOn] = useState({ name: "", description: "", price: "" });

  const isLoading = userLoading || bandLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-night">
        <div className="animate-pulse">
          <div className="w-12 h-12 bg-lime animate-pulse-lime" />
        </div>
      </div>
    );
  }

  if (!isMusician || !band) {
    return (
      <div className="min-h-screen bg-night p-6">
        <Link
          href="/bookings"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </Link>
        <div className="text-center py-12">
          <h1 className="text-2xl font-display text-white mb-2">
            Musicians Only
          </h1>
          <p className="text-zinc-400">
            You need to be a musician with a band to create a listing
          </p>
        </div>
      </div>
    );
  }

  const toggleEventType = (type: MarketplaceEventType) => {
    setFormData((f) => ({
      ...f,
      eventTypes: f.eventTypes.includes(type)
        ? f.eventTypes.filter((t) => t !== type)
        : [...f.eventTypes, type],
    }));
  };

  const addAddOn = () => {
    if (!newAddOn.name || !newAddOn.price) return;
    setAddOns((prev) => [
      ...prev,
      {
        name: newAddOn.name,
        description: newAddOn.description,
        priceInCents: Math.round(Number(newAddOn.price) * 100),
      },
    ]);
    setNewAddOn({ name: "", description: "", price: "" });
  };

  const removeAddOn = (index: number) => {
    setAddOns((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!band || formData.eventTypes.length === 0) return;

    setIsSubmitting(true);
    try {
      await createListing({
        bandId: band._id as Id<"bands">,
        title: formData.title,
        description: formData.description || undefined,
        eventTypes: formData.eventTypes,
        baseHourlyRate: Math.round(Number(formData.baseHourlyRate) * 100),
        minimumHours: Number(formData.minimumHours),
        depositPercentage: Number(formData.depositPercentage),
        addOns: addOns.length > 0 ? addOns : undefined,
        maxTravelDistance: formData.maxTravelDistance
          ? Number(formData.maxTravelDistance)
          : undefined,
        bookingNotes: formData.bookingNotes || undefined,
        cancellationPolicy: formData.cancellationPolicy || undefined,
        status: "active",
      });

      router.push("/bookings?tab=settings");
    } catch (error) {
      console.error("Failed to create listing:", error);
      alert("Failed to create listing. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-night pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-night/95 backdrop-blur-lg border-b border-lime/10">
        <div className="px-4 py-4 flex items-center gap-3">
          <Link
            href="/bookings"
            className="w-10 h-10 rounded-full bg-night-secondary flex items-center justify-center text-white hover:bg-night transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-medium text-white">Create Listing</h1>
            <p className="text-sm text-zinc-400">{band.name}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {/* Title */}
        <div>
          <label className="text-sm text-zinc-400 mb-2 block">
            Listing Title *
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
            placeholder="e.g., Book us for your next event!"
            className="w-full px-3 py-2 bg-night-secondary border border-lime/10 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-lime/30"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-sm text-zinc-400 mb-2 block">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData((f) => ({ ...f, description: e.target.value }))
            }
            placeholder="Tell fans what makes your band special..."
            rows={4}
            className="w-full px-3 py-2 bg-night-secondary border border-lime/10 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-lime/30 resize-none"
          />
        </div>

        {/* Event Types */}
        <div>
          <label className="text-sm text-zinc-400 mb-2 block">
            Event Types * (select all that apply)
          </label>
          <div className="flex flex-wrap gap-2">
            {EVENT_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => toggleEventType(type.value)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  formData.eventTypes.includes(type.value)
                    ? "bg-lime text-night"
                    : "bg-night-secondary text-zinc-400 hover:text-white"
                )}
              >
                {type.label}
              </button>
            ))}
          </div>
          {formData.eventTypes.length === 0 && (
            <p className="text-xs text-red-400 mt-1">
              Select at least one event type
            </p>
          )}
        </div>

        {/* Pricing */}
        <div className="bg-night-secondary rounded-xl p-4 border border-lime/10 space-y-4">
          <h2 className="text-lg font-medium text-white">Pricing</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">
                Hourly Rate ($) *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="number"
                  required
                  min="10"
                  step="0.01"
                  value={formData.baseHourlyRate}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, baseHourlyRate: e.target.value }))
                  }
                  placeholder="100"
                  className="w-full pl-9 pr-3 py-2 bg-night border border-lime/10 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-lime/30"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-zinc-400 mb-2 block">
                Minimum Hours *
              </label>
              <input
                type="number"
                required
                min="1"
                max="24"
                value={formData.minimumHours}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, minimumHours: e.target.value }))
                }
                className="w-full px-3 py-2 bg-night border border-lime/10 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-lime/30"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-zinc-400 mb-2 block">
              Deposit Percentage (%) *
            </label>
            <input
              type="number"
              required
              min="0"
              max="100"
              value={formData.depositPercentage}
              onChange={(e) =>
                setFormData((f) => ({ ...f, depositPercentage: e.target.value }))
              }
              className="w-full px-3 py-2 bg-night border border-lime/10 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-lime/30"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Fans will pay this percentage upfront to secure the booking
            </p>
          </div>
        </div>

        {/* Add-ons */}
        <div className="bg-night-secondary rounded-xl p-4 border border-lime/10 space-y-4">
          <h2 className="text-lg font-medium text-white">Add-on Services</h2>
          <p className="text-sm text-zinc-400">
            Optional extras fans can add to their booking
          </p>

          {/* Existing add-ons */}
          {addOns.length > 0 && (
            <div className="space-y-2">
              {addOns.map((addOn, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-night rounded-lg"
                >
                  <div>
                    <p className="text-white font-medium">{addOn.name}</p>
                    {addOn.description && (
                      <p className="text-sm text-zinc-400">{addOn.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lime">
                      ${(addOn.priceInCents / 100).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAddOn(index)}
                      className="text-zinc-500 hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* New add-on form */}
          <div className="space-y-2 pt-2 border-t border-lime/10">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={newAddOn.name}
                onChange={(e) =>
                  setNewAddOn((a) => ({ ...a, name: e.target.value }))
                }
                placeholder="Add-on name"
                className="px-3 py-2 bg-night border border-lime/10 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-lime/30"
              />
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newAddOn.price}
                  onChange={(e) =>
                    setNewAddOn((a) => ({ ...a, price: e.target.value }))
                  }
                  placeholder="Price"
                  className="w-full pl-9 pr-3 py-2 bg-night border border-lime/10 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-lime/30"
                />
              </div>
            </div>
            <input
              type="text"
              value={newAddOn.description}
              onChange={(e) =>
                setNewAddOn((a) => ({ ...a, description: e.target.value }))
              }
              placeholder="Description (optional)"
              className="w-full px-3 py-2 bg-night border border-lime/10 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-lime/30"
            />
            <button
              type="button"
              onClick={addAddOn}
              disabled={!newAddOn.name || !newAddOn.price}
              className="flex items-center gap-2 px-4 py-2 text-lime hover:text-lime/80 disabled:text-zinc-600 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>

        {/* Additional Settings */}
        <div className="bg-night-secondary rounded-xl p-4 border border-lime/10 space-y-4">
          <h2 className="text-lg font-medium text-white">Additional Settings</h2>

          <div>
            <label className="text-sm text-zinc-400 mb-2 block">
              Maximum Travel Distance (miles)
            </label>
            <input
              type="number"
              min="0"
              max="500"
              value={formData.maxTravelDistance}
              onChange={(e) =>
                setFormData((f) => ({ ...f, maxTravelDistance: e.target.value }))
              }
              placeholder="Leave empty for no limit"
              className="w-full px-3 py-2 bg-night border border-lime/10 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-lime/30"
            />
          </div>

          <div>
            <label className="text-sm text-zinc-400 mb-2 block">
              Booking Notes
            </label>
            <textarea
              value={formData.bookingNotes}
              onChange={(e) =>
                setFormData((f) => ({ ...f, bookingNotes: e.target.value }))
              }
              placeholder="Any additional info fans should know before booking..."
              rows={3}
              className="w-full px-3 py-2 bg-night border border-lime/10 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-lime/30 resize-none"
            />
          </div>

          <div>
            <label className="text-sm text-zinc-400 mb-2 block">
              Cancellation Policy
            </label>
            <textarea
              value={formData.cancellationPolicy}
              onChange={(e) =>
                setFormData((f) => ({ ...f, cancellationPolicy: e.target.value }))
              }
              placeholder="Describe your cancellation and refund policy..."
              rows={3}
              className="w-full px-3 py-2 bg-night border border-lime/10 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-lime/30 resize-none"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <Link
            href="/bookings"
            className="flex-1 py-3 bg-night-secondary text-zinc-300 font-medium rounded-xl text-center border border-zinc-700 hover:border-zinc-500 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || formData.eventTypes.length === 0 || !formData.baseHourlyRate}
            className="flex-1 py-3 bg-lime text-night font-bold rounded-xl hover:bg-lime/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Creating..." : "Create Listing"}
          </button>
        </div>
      </form>
    </div>
  );
}
