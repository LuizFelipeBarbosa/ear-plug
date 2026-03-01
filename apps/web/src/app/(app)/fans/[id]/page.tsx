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
      <div className="min-h-screen bg-background p-4 space-y-4">
        {" "}
        <div className="h-11 bg-muted border border-border animate-shimmer" />{" "}
        <div className="h-48 bg-muted border border-border animate-shimmer" />{" "}
        <div className="h-56 bg-muted border border-border animate-shimmer" />{" "}
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        {" "}
        <div className="text-center">
          {" "}
          <p className="text-foreground font-bold mb-2">
            {" "}
            Fan profile not found{" "}
          </p>{" "}
          <button
            type="button"
            onClick={() => router.push("/home")}
            className="px-4 py-2 border-2 border-fan text-fan text-xs font-bold hover:bg-fan hover:text-foreground transition-colors"
          >
            {" "}
            Back to Discover{" "}
          </button>{" "}
        </div>{" "}
      </div>
    );
  }
  const {
    fan,
    topGenres,
    savedArtists,
    mostViewedSavedArtists,
    pastShows,
    gigDna,
  } = profile;
  return (
    <div className="min-h-screen bg-background pb-6">
      {" "}
      <header className="sticky top-0 z-20 bg-card border-b-2 border-fan/20 p-4">
        {" "}
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-3 inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-fan transition-colors"
        >
          {" "}
          <ArrowLeft className="w-4 h-4" /> Back{" "}
        </button>{" "}
        <div className="bg-muted border-2 border-border p-4">
          {" "}
          <div className="flex items-center gap-4">
            {" "}
            <div className="w-16 h-16 overflow-hidden bg-card border border-border flex items-center justify-center flex-shrink-0">
              {" "}
              {fan.avatar ? (
                <Image
                  src={fan.avatar}
                  alt={fan.name}
                  width={64}
                  height={64}
                  className="object-cover"
                />
              ) : (
                <span className="text-lg font-bold text-fan">
                  {getInitials(fan.name)}
                </span>
              )}{" "}
            </div>{" "}
            <div className="min-w-0 flex-1">
              {" "}
              <h1 className="text-lg font-bold text-foreground truncate">
                {" "}
                {fan.name}{" "}
              </h1>{" "}
              {fan.location ? (
                <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  {" "}
                  <MapPin className="w-3.5 h-3.5 text-fan" />{" "}
                  {fan.location}{" "}
                </span>
              ) : null}{" "}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {" "}
                <span className="inline-flex items-center gap-1">
                  {" "}
                  <Ticket className="w-3.5 h-3.5 text-fan" />{" "}
                  {fan.showsAttended} checked-in shows{" "}
                </span>{" "}
                <span className="inline-flex items-center gap-1">
                  {" "}
                  <Calendar className="w-3.5 h-3.5 text-band" /> Joined{" "}
                  {formatFullDate(fan.memberSince)}{" "}
                </span>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </header>{" "}
      <main className="p-4 space-y-6">
        {" "}
        <section>
          {" "}
          <h2 className="text-sm font-bold text-muted-foreground mb-3">
            {" "}
            Top Genres (Attendance-Based){" "}
          </h2>{" "}
          {topGenres.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {" "}
              {topGenres.map((entry) => (
                <div
                  key={entry.genre}
                  className="px-3 py-2 border-2 text-foreground text-xs font-bold "
                  style={{
                    backgroundColor: GENRE_COLORS[entry.genre as Genre],
                    borderColor: GENRE_COLORS[entry.genre as Genre],
                  }}
                >
                  {" "}
                  {entry.label} · {entry.attendedCount}{" "}
                </div>
              ))}{" "}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No attended shows yet.
            </p>
          )}{" "}
        </section>{" "}
        <section>
          {" "}
          <h2 className="text-sm font-bold text-muted-foreground mb-3">
            {" "}
            Saved Artists{" "}
          </h2>{" "}
          {savedArtists.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {" "}
              {savedArtists.map((artist) => (
                <Link
                  key={artist.bandId}
                  href={`/bands/${artist.bandId}`}
                  className="group border border-border bg-muted p-3 hover:border-fan/40 transition-colors"
                >
                  {" "}
                  <div className="flex items-center gap-3">
                    {" "}
                    <div className="w-12 h-12 bg-card border border-border overflow-hidden flex items-center justify-center">
                      {" "}
                      {artist.image ? (
                        <Image
                          src={artist.image}
                          alt={artist.name}
                          width={48}
                          height={48}
                          className="object-cover"
                        />
                      ) : (
                        <span className="text-xs font-bold text-fan">
                          {" "}
                          {getInitials(artist.name)}{" "}
                        </span>
                      )}{" "}
                    </div>{" "}
                    <div className="min-w-0">
                      {" "}
                      <p className="text-sm font-bold text-foreground truncate group-hover:text-fan transition-colors">
                        {" "}
                        {artist.name}{" "}
                      </p>{" "}
                      <p className="text-xs text-muted-foreground truncate">
                        {artist.location}
                      </p>{" "}
                    </div>{" "}
                  </div>{" "}
                </Link>
              ))}{" "}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No saved artists yet.
            </p>
          )}{" "}
        </section>{" "}
        <section>
          {" "}
          <h2 className="text-sm font-bold text-muted-foreground mb-3">
            {" "}
            Most Viewed / Saved Artists{" "}
          </h2>{" "}
          {mostViewedSavedArtists.length > 0 ? (
            <div className="space-y-2">
              {" "}
              {mostViewedSavedArtists.map((artist, index) => (
                <Link
                  key={artist.bandId}
                  href={`/bands/${artist.bandId}`}
                  className="flex items-center justify-between gap-3 border border-border bg-muted px-3 py-2 hover:border-fan/40 transition-colors"
                >
                  {" "}
                  <div className="min-w-0 flex items-center gap-3">
                    {" "}
                    <span className="text-xs font-bold text-muted-foreground w-6">
                      {" "}
                      {index + 1}{" "}
                    </span>{" "}
                    <div className="min-w-0">
                      {" "}
                      <p className="text-sm font-semibold text-foreground truncate">
                        {artist.name}
                      </p>{" "}
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        {" "}
                        <span className="inline-flex items-center gap-1">
                          {" "}
                          <Eye className="w-3 h-3" /> {artist.viewCount}{" "}
                          views{" "}
                        </span>{" "}
                        {artist.isSaved ? (
                          <span className="inline-flex items-center gap-1 text-fan">
                            {" "}
                            <Heart className="w-3 h-3" /> Saved{" "}
                          </span>
                        ) : null}{" "}
                      </div>{" "}
                    </div>{" "}
                  </div>{" "}
                  <span className="text-xs font-bold text-fan">
                    {" "}
                    Score {artist.score}{" "}
                  </span>{" "}
                </Link>
              ))}{" "}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No artist engagement yet.
            </p>
          )}{" "}
        </section>{" "}
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
        />{" "}
        <section>
          {" "}
          <h2 className="text-sm font-bold text-muted-foreground mb-3">
            {" "}
            Gig DNA{" "}
          </h2>{" "}
          <div className="border-2 border-fan/30 bg-muted p-4">
            {" "}
            <div className="flex items-start gap-3">
              {" "}
              <div className="w-10 h-10 border border-fan/40 bg-fan/10 flex items-center justify-center">
                {" "}
                <Sparkles className="w-5 h-5 text-fan" />{" "}
              </div>{" "}
              <div className="min-w-0">
                {" "}
                <p className="text-xs text-muted-foreground">Archetype</p>{" "}
                <p className="text-xl font-bold text-foreground ">
                  {" "}
                  {gigDna.label}{" "}
                </p>{" "}
                <p className="text-sm text-muted-foreground mt-2">
                  {" "}
                  Dominant Genre: {capitalizeGenre(gigDna.dominantGenre)}{" "}
                </p>{" "}
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] ">
                  {" "}
                  <span className="px-2 py-1 border border-border text-muted-foreground">
                    {" "}
                    {gigDna.attendedShows} attended{" "}
                  </span>{" "}
                  <span className="px-2 py-1 border border-border text-muted-foreground">
                    {" "}
                    {gigDna.distinctVenues} venues{" "}
                  </span>{" "}
                  <span className="px-2 py-1 border border-border text-muted-foreground">
                    {" "}
                    Tier {gigDna.tier}{" "}
                  </span>{" "}
                </div>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </section>{" "}
      </main>{" "}
    </div>
  );
}
