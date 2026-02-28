"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import {
  ArrowLeft,
  Calendar,
  Eye,
  Heart,
  MapPin,
  Sparkles,
  Ticket,
} from "lucide-react";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { PastShowFlyerSection } from "@/components/events/PastShowFlyerSection";
import { GENRE_COLORS, formatFullDate } from "@ear-plug/shared/constants";
import { getInitials } from "@ear-plug/shared/utils";
import type { Genre } from "@ear-plug/shared/types";

interface PageProps {
  params: { id: string };
}

function capitalizeGenre(genre: Genre | null): string {
  if (!genre) return "No dominant genre yet";
  return genre.charAt(0).toUpperCase() + genre.slice(1);
}

export default function PublicFanProfilePage({ params }: PageProps) {
  const router = useRouter();
  const fanId = params.id as Id<"users">;
  const profile = useQuery(api.users.getPublicFanProfile, { fanId });

  if (profile === undefined) {
    return (
      <div className="min-h-screen bg-night p-4 space-y-4">
        <div className="h-11 bg-night-tertiary border border-zinc-800 animate-shimmer" />
        <div className="h-48 bg-night-tertiary border border-zinc-800 animate-shimmer" />
        <div className="h-56 bg-night-tertiary border border-zinc-800 animate-shimmer" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-night flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white font-bold uppercase tracking-wide mb-2">
            Fan profile not found
          </p>
          <button
            type="button"
            onClick={() => router.push("/home")}
            className="px-4 py-2 border-2 border-lime text-lime text-xs font-bold uppercase tracking-wider hover:bg-lime hover:text-night transition-colors"
          >
            Back to Discover
          </button>
        </div>
      </div>
    );
  }

  const { fan, topGenres, savedArtists, mostViewedSavedArtists, pastShows, gigDna } = profile;

  return (
    <div className="min-h-screen bg-night pb-6">
      <header className="sticky top-0 z-20 bg-night-secondary border-b-2 border-lime/20 p-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-lime transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="bg-night-tertiary border-2 border-zinc-800 p-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 overflow-hidden bg-night-secondary border border-zinc-700 flex items-center justify-center flex-shrink-0">
              {fan.avatar ? (
                <Image
                  src={fan.avatar}
                  alt={fan.name}
                  width={64}
                  height={64}
                  className="object-cover"
                />
              ) : (
                <span className="text-lg font-bold text-lime">{getInitials(fan.name)}</span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold text-white uppercase tracking-tight truncate">
                {fan.name}
              </h1>
              {fan.location ? (
                <span className="mt-1 inline-flex items-center gap-1 text-xs text-zinc-400">
                  <MapPin className="w-3.5 h-3.5 text-lime" />
                  {fan.location}
                </span>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                <span className="inline-flex items-center gap-1">
                  <Ticket className="w-3.5 h-3.5 text-lime" />
                  {fan.showsAttended} checked-in shows
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-violet" />
                  Joined {formatFullDate(fan.memberSince)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-6">
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-3">
            Top Genres (Attendance-Based)
          </h2>
          {topGenres.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {topGenres.map((entry) => (
                <div
                  key={entry.genre}
                  className="px-3 py-2 border-2 text-night text-xs font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor: GENRE_COLORS[entry.genre as Genre],
                    borderColor: GENRE_COLORS[entry.genre as Genre],
                  }}
                >
                  {entry.label} · {entry.attendedCount}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No attended shows yet.</p>
          )}
        </section>

        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-3">
            Saved Artists
          </h2>
          {savedArtists.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {savedArtists.map((artist) => (
                <Link
                  key={artist.bandId}
                  href={`/bands/${artist.bandId}`}
                  className="group border border-zinc-800 bg-night-tertiary p-3 hover:border-lime/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-night-secondary border border-zinc-700 overflow-hidden flex items-center justify-center">
                      {artist.image ? (
                        <Image
                          src={artist.image}
                          alt={artist.name}
                          width={48}
                          height={48}
                          className="object-cover"
                        />
                      ) : (
                        <span className="text-xs font-bold text-lime">
                          {getInitials(artist.name)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate group-hover:text-lime transition-colors">
                        {artist.name}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">{artist.location}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No saved artists yet.</p>
          )}
        </section>

        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-3">
            Most Viewed / Saved Artists
          </h2>
          {mostViewedSavedArtists.length > 0 ? (
            <div className="space-y-2">
              {mostViewedSavedArtists.map((artist, index) => (
                <Link
                  key={artist.bandId}
                  href={`/bands/${artist.bandId}`}
                  className="flex items-center justify-between gap-3 border border-zinc-800 bg-night-tertiary px-3 py-2 hover:border-lime/40 transition-colors"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 w-6">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{artist.name}</p>
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-zinc-500">
                        <span className="inline-flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {artist.viewCount} views
                        </span>
                        {artist.isSaved ? (
                          <span className="inline-flex items-center gap-1 text-lime">
                            <Heart className="w-3 h-3" />
                            Saved
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-lime">
                    Score {artist.score}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No artist engagement yet.</p>
          )}
        </section>

        <PastShowFlyerSection
          shows={pastShows.map((show) => ({
            eventId: show.eventId,
            title: show.title,
            dateTime: show.dateTime,
            image: show.image,
            venueName: show.venue.name,
            venueCity: show.venue.city,
            bandName: show.band?.name,
          }))}
          emptyMessage="No attended past shows yet."
        />

        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-3">
            Gig DNA
          </h2>
          <div className="border-2 border-lime/30 bg-night-tertiary p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 border border-lime/40 bg-lime/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-lime" />
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-zinc-500">Archetype</p>
                <p className="text-xl font-bold text-white uppercase tracking-tight">
                  {gigDna.label}
                </p>
                <p className="text-sm text-zinc-400 mt-2">
                  Dominant Genre: {capitalizeGenre(gigDna.dominantGenre)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-wider">
                  <span className="px-2 py-1 border border-zinc-700 text-zinc-300">
                    {gigDna.attendedShows} attended
                  </span>
                  <span className="px-2 py-1 border border-zinc-700 text-zinc-300">
                    {gigDna.distinctVenues} venues
                  </span>
                  <span className="px-2 py-1 border border-zinc-700 text-zinc-300">
                    Tier {gigDna.tier}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
