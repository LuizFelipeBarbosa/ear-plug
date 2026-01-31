"use client";

import { use } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Heart,
  Share2,
  MapPin,
  Calendar,
  Clock,
  Users,
  DollarSign,
  ExternalLink,
} from "lucide-react";
import { useEvent } from "@/hooks/useEvents";
import {
  formatEventDate,
  formatEventTime,
  formatFullDate,
  formatPrice,
} from "@ear-plug/shared/constants";
import { cn } from "@/lib/utils";
import type { Id } from "../../../../../../convex/_generated/dataModel";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EventDetailsPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const eventId = id as Id<"events">;

  const { event, hasRsvp, hasLiked, isLoading, rsvp, toggleLike } =
    useEvent(eventId);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event?.title,
          text: `Check out ${event?.title} at ${event?.venue?.name}`,
          url: window.location.href,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-surface-dark">
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 dark:bg-gray-800" />
          <div className="p-6 space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Event not found
          </h2>
          <button
            onClick={() => router.back()}
            className="text-primary-600 hover:text-primary-700"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const spotsLeft = event.capacity - event.rsvpCount;
  const fillPercentage = Math.min((event.rsvpCount / event.capacity) * 100, 100);

  return (
    <div className="min-h-screen bg-white dark:bg-surface-dark pb-24">
      {/* Header Image */}
      <div className="relative h-72">
        {event.image ? (
          <Image
            src={event.image}
            alt={event.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-500 to-accent-500" />
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Actions */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors"
            >
              <Share2 className="w-6 h-6" />
            </button>
            <button
              onClick={() => toggleLike()}
              className={cn(
                "p-2 rounded-full transition-colors",
                hasLiked
                  ? "bg-accent-500 text-white"
                  : "bg-white/20 backdrop-blur-sm text-white hover:bg-white/30"
              )}
            >
              <Heart className={cn("w-6 h-6", hasLiked && "fill-current")} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Band Info */}
        {event.band && (
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
              {event.band.image ? (
                <Image
                  src={event.band.image}
                  alt={event.band.name}
                  width={48}
                  height={48}
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary-400 to-accent-400" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {event.band.name}
              </h3>
              <p className="text-sm text-primary-600 dark:text-primary-400">
                {event.genre.charAt(0).toUpperCase() + event.genre.slice(1)}
              </p>
            </div>
          </div>
        )}

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {event.title}
        </h1>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <DetailCard
            icon={<Calendar className="w-5 h-5 text-primary-500" />}
            label="Date"
            value={formatFullDate(event.dateTime)}
          />
          <DetailCard
            icon={<Clock className="w-5 h-5 text-primary-500" />}
            label="Time"
            value={formatEventTime(event.dateTime)}
          />
          <DetailCard
            icon={<Users className="w-5 h-5 text-primary-500" />}
            label="RSVPs"
            value={`${event.rsvpCount} / ${event.capacity}`}
          />
          <DetailCard
            icon={<DollarSign className="w-5 h-5 text-primary-500" />}
            label="Ticket"
            value={event.price ? formatPrice(event.price) : "Free"}
          />
        </div>

        {/* RSVP Progress */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-surface-dark-secondary rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {spotsLeft} spots remaining
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(fillPercentage)}% full
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-500"
              style={{ width: `${fillPercentage}%` }}
            />
          </div>
        </div>

        {/* Venue Info */}
        {event.venue && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Venue
            </h2>
            <div className="p-4 bg-gray-50 dark:bg-surface-dark-secondary rounded-xl">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary-500 mt-0.5" />
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {event.venue.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {event.venue.address}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {event.venue.city} • Capacity: {event.venue.capacity}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              About
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {event.description}
            </p>
          </div>
        )}
      </div>

      {/* RSVP Button - Fixed Bottom */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-white dark:bg-surface-dark border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={() => rsvp()}
          disabled={spotsLeft <= 0 && !hasRsvp}
          className={cn(
            "w-full py-4 rounded-xl font-semibold text-lg transition-all",
            hasRsvp
              ? "bg-success-500 text-white"
              : spotsLeft <= 0
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-primary-600 text-white hover:bg-primary-700 active:scale-[0.98]"
          )}
        >
          {hasRsvp ? "You're Going! ✓" : spotsLeft <= 0 ? "Sold Out" : "RSVP to Event"}
        </button>
      </div>
    </div>
  );
}

function DetailCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="p-4 bg-gray-50 dark:bg-surface-dark-secondary rounded-xl">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <p className="font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}
